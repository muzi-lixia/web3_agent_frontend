import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';

import { ApiError, api } from '@/lib/api';
import { chatSignal } from '@/lib/inflight';
import { mockChat } from '@/lib/mock';
import { newId, useAppStore, type UiMessage } from '@/store/app-store';
import type { ChatResponse } from '@/types';

interface SendVars {
  text: string;
  requestKey: string;
  signal: AbortSignal;
}

interface SendResult {
  response: ChatResponse;
  latencyMs: number;
  source: 'live' | 'mock';
}

export function useChat() {
  const mutation = useMutation({
    mutationFn: async ({ text, requestKey, signal }: SendVars): Promise<SendResult> => {
      const { wallet, mockMode, auth } = useAppStore.getState();

      if (mockMode) {
        const result = await mockChat({ userMessage: text, wallet });
        return { ...result, source: 'mock' };
      }

      // /chat 是 require_identity：没有有效 JWT 后端直接 401 E503，本地先拦一道给出可读提示
      if (!auth || auth.expiresAt <= Date.now()) {
        throw new ApiError('请先连接钱包并登录', {
          code: 'E503',
          status: 401,
          retryable: false,
        });
      }

      // 后端拿 JWT 里的 chain_id 比对请求体的 wallet.chainId，不一致回 E509
      if (wallet && wallet.chainId !== auth.chainId) {
        throw new ApiError('链与登录身份不一致，请重新签名登录', {
          code: 'E509',
          status: 403,
          retryable: false,
        });
      }

      const result = await api.chat({
        userMessage: text,
        wallet,
        token: auth.token,
        knowledgeBaseId: useAppStore.getState().knowledgeBaseId,
        idempotencyKey: requestKey,
        signal,
      });
      return { ...result, source: 'live' };
    },
  });

  const busy = useRef(false);

  const send = async (raw: string, requestKey?: string) => {
    const text = raw.trim();
    if (!text || busy.current || mutation.isPending) return;

    const store = useAppStore.getState();

    // 没登录就别先往界面上写一条注定失败的消息，直接把登录弹窗拉出来
    if (!store.mockMode && (!store.auth || store.auth.expiresAt <= Date.now())) {
      store.openWallet();
      return;
    }

    busy.current = true;

    // 重发同一条消息时沿用原来的键：服务端要么回放上次结果，要么正在跑就拒掉，
    // 不会把同一句话执行两轮。新消息才生成新键。
    const idempotencyKey = requestKey ?? newId();

    store.appendMessage({
      id: newId(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
      status: 'done',
      requestKey: idempotencyKey,
    });

    const placeholderId = newId();
    store.appendMessage({
      id: placeholderId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      status: 'pending',
    });

    try {
      const { response, latencyMs, source } = await mutation.mutateAsync({
        text,
        requestKey: idempotencyKey,
        signal: chatSignal(),
      });

      // 服务端读到版本已变：这条答案是基于用户刚删掉的历史生成的，既不落库也不该上屏。
      // 占位气泡直接撤掉，界面上什么都不会出现 —— 用户刚点了清空，不该再弹提示。
      if (response.data?.discarded) {
        useAppStore.getState().removeMessage(placeholderId);
        return;
      }

      const patch: Partial<UiMessage> = {
        content: response.content,
        status: 'done',
        type: response.type,
        data: response.data,
        toolCalls: response.data?.toolCalls ?? [],
        steps: response.data?.steps ?? 0,
        riskTags: response.riskTags ?? [],
        intentPreview: response.intentPreview ?? null,
        taskId: response.taskId ?? null,
        latencyMs,
        source,
        error: null,
      };
      useAppStore.getState().patchMessage(placeholderId, patch);
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError(error instanceof Error ? error.message : '请求失败', {
              code: 'UNKNOWN',
              status: 0,
            });

      // 用户在这期间清空了对话或删除了数据：这一轮连同气泡一起作废，不留错误提示。
      if (apiError.code === 'ABORTED') {
        useAppStore.getState().removeMessage(placeholderId);
        return;
      }

      useAppStore.getState().patchMessage(placeholderId, {
        status: 'error',
        content: '',
        source: useAppStore.getState().mockMode ? 'mock' : 'live',
        error: {
          code: apiError.code,
          message: apiError.message,
          retryable: apiError.retryable,
          status: apiError.status,
          traceId: apiError.traceId,
        },
      });

      // 401 说明 JWT 已失效：清掉登录态，让界面回到「需要登录」而不是假装还登着
      if (apiError.status === 401) useAppStore.getState().setAuth(null);
    } finally {
      busy.current = false;
    }
  };

  return { send, isSending: mutation.isPending };
}
