import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { api } from '@/lib/api';
import { useAppStore, type UiMessage } from '@/store/app-store';
import type { ClearResult, HistoryItem, PurgeResult } from '@/types';

/** 后端把 limit 夹在 1..50，所以一页就是 50 条（25 轮）。 */
const PAGE_SIZE = 50;

function toUiMessage(item: HistoryItem): UiMessage {
  return {
    id: `h-${item.id}`,
    role: item.role,
    content: item.content,
    createdAt: new Date(item.createdAt).getTime(),
    status: 'done',
    source: 'live',
    // 工具轨迹随消息落库，回放时一并复原，否则刷新后工具卡片会凭空消失
    toolCalls: item.toolCalls ?? [],
    data: { citations: item.citations ?? [] },
    steps: item.toolCalls?.length ?? 0,
  };
}

function currentToken(): string | null {
  const { auth } = useAppStore.getState();
  return auth && auth.expiresAt > Date.now() ? auth.token : null;
}

/**
 * 登录后把服务端记录铺回当前会话。
 * 未登录时后端一律 401，所以这里以 token 为准，而不是钱包是否连着。
 */
export function useHistorySync() {
  const auth = useAppStore((state) => state.auth);
  const mockMode = useAppStore((state) => state.mockMode);
  const token = auth && auth.expiresAt > Date.now() ? auth.token : null;

  const query = useQuery({
    queryKey: ['chat', 'history', token],
    queryFn: () => api.history({ token: token as string, limit: PAGE_SIZE }),
    enabled: Boolean(token) && !mockMode,
    retry: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const appliedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!token || !query.data) return;
    if (appliedFor.current === token) return;
    appliedFor.current = token;

    const items = query.data.items;
    // 服务端空记录不覆盖本地：那说明这个地址还没发过消息，覆盖只会白丢刚输入的内容
    if (items.length === 0) return;

    useAppStore.getState().replaceMessages(items.map(toUiMessage));
    useAppStore.getState().setHistoryPage({
      hasMore: query.data.hasMore,
      earliestId: items[0].id,
    });
  }, [token, query.data]);

  return { isLoading: query.isLoading, refetch: query.refetch };
}

/** 往前翻一页更早的记录。返回真正追加的条数，0 表示没得翻了。 */
export function useLoadEarlier() {
  const mutation = useMutation({
    mutationFn: async (): Promise<number> => {
      const token = currentToken();
      const { history } = useAppStore.getState();
      if (!token || !history.hasMore || history.earliestId === null) return 0;

      const page = await api.history({
        token,
        before: history.earliestId,
        limit: PAGE_SIZE,
      });
      const items = page.items;
      if (items.length === 0) {
        useAppStore.getState().setHistoryPage({ hasMore: false });
        return 0;
      }

      useAppStore.getState().prependMessages(items.map(toUiMessage));
      useAppStore.getState().setHistoryPage({
        hasMore: page.hasMore,
        earliestId: items[0].id,
      });
      return items.length;
    },
  });

  return { loadEarlier: mutation.mutateAsync, isLoadingEarlier: mutation.isPending };
}

/** 清空服务端对话。未登录时是空操作，只有本地记录被清。 */
export function useClearConversation() {
  const mutation = useMutation({
    mutationFn: async (): Promise<ClearResult | null> => {
      const token = currentToken();
      if (!token) return null;
      return api.clear(token);
    },
  });

  return { clearRemote: mutation.mutateAsync, isClearing: mutation.isPending };
}

/** 合规删除：消息、摘要、档案、长期记忆一起删，不可恢复。 */
export function usePurgeData() {
  const mutation = useMutation({
    mutationFn: async (): Promise<PurgeResult | null> => {
      const token = currentToken();
      if (!token) return null;
      return api.purge(token);
    },
  });

  return { purge: mutation.mutateAsync, isPurging: mutation.isPending };
}
