import type { RagMetadata, RagJob, RagDocument, RagSearch, RagSearchResult, RagPage, KnowledgeBase } from '@/types/rag';
import type {
  ApiErrorBody,
  AuthNonce,
  AuthVerifyResult,
  ChatResponse,
  ClearResult,
  HealthPayload,
  HistoryPage,
  PurgeResult,
  ReadyPayload,
  WalletRef,
  WorkflowStatus,
} from '@/types';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const BASE = RAW_BASE.replace(/\/+$/, '');

export const apiBaseLabel = BASE || '同源代理 · /api';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  /** 后端每个错误响应都带 X-Trace-Id，排障时把它念给后端听就能定位那一行日志。 */
  readonly traceId: string | null;

  constructor(
    message: string,
    options: { code: string; status: number; retryable?: boolean; traceId?: string | null },
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.traceId = options.traceId ?? null;
  }
}

interface RequestResult<T> {
  data: T;
  latencyMs: number;
  status: number;
}

async function request<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<RequestResult<T>> {
  const started = performance.now();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), init?.timeoutMs ?? 90_000);
  // 外部取消（清空对话）与超时共用一个信号，但两者要给出不同的错误。
  const external = init?.signal;
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
        ...(init?.headers ?? {}),
      },
    });

    const latencyMs = Math.round(performance.now() - started);
    const text = await response.text();
    let payload: unknown = undefined;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const body = (payload ?? {}) as Partial<ApiErrorBody>;
      throw new ApiError(body.errorMsg || `请求失败（HTTP ${response.status}）`, {
        code: body.errorCode || `HTTP_${response.status}`,
        status: response.status,
        // 后端只在明确可重试时置 true；429 是配额耗尽，语义上同样是「过一会儿再来」
        retryable: body.retryable ?? (response.status === 429 || response.status >= 500),
        traceId: response.headers.get('x-trace-id'),
      });
    }

    return { data: payload as T, latencyMs, status: response.status };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (external?.aborted) {
        throw new ApiError('请求已取消', { code: 'ABORTED', status: 0 });
      }
      throw new ApiError('请求超时，后端未在预期时间内响应', {
        code: 'TIMEOUT',
        status: 0,
        retryable: true,
      });
    }
    throw new ApiError('无法连接后端服务，请确认本地 FastAPI 已启动', {
      code: 'NETWORK',
      status: 0,
      retryable: true,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export interface ChatPayload {
  userMessage: string;
  wallet: WalletRef | null;
  /** /chat 强制 Bearer：后端 require_identity，没 token 直接 401 E503。 */
  token: string;
  knowledgeBaseId?: string;
  /** 同一条消息重发时必须沿用同一个值，服务端据此只跑一轮并回放上次结果。 */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface ChatResult {
  response: ChatResponse;
  latencyMs: number;
}

const bearer = (token?: string | null): Record<string, string> =>
  token ? { authorization: `Bearer ${token}` } : {};

/** 写链路：确认意图、查任务状态、上报广播哈希。状态只认后端，前端上报不推进任务。 */
export const workflowApi = {
  async confirm(token: string, taskId: string, accepted: boolean) {
    const result = await request<{ status: 'ACCEPTED' | 'REJECTED' }>(
      '/api/v1/intent/confirm',
      {
        method: 'POST',
        timeoutMs: 15_000,
        headers: bearer(token),
        body: JSON.stringify({ taskId, accepted }),
      },
    );
    return result.data;
  },

  async status(token: string, taskId: string) {
    const result = await request<WorkflowStatus>(
      `/api/v1/workflow/${encodeURIComponent(taskId)}`,
      { timeoutMs: 20_000, headers: bearer(token) },
    );
    return result.data;
  },

  async report(
    token: string,
    taskId: string,
    txHash: string,
    status: 'broadcast' | 'confirmed' | 'failed' | 'replaced',
  ) {
    const result = await request<{ success: boolean; msg: string }>('/api/v1/tx/report', {
      method: 'POST',
      timeoutMs: 15_000,
      headers: bearer(token),
      body: JSON.stringify({ taskId, txHash, status }),
    });
    return result.data;
  },
};

export const api = {
  async chat(payload: ChatPayload): Promise<ChatResult> {
    const result = await request<ChatResponse>('/api/v1/chat', {
      method: 'POST',
      signal: payload.signal,
      headers: bearer(payload.token),
      body: JSON.stringify({
        userMessage: payload.userMessage,
        knowledgeBaseId: payload.knowledgeBaseId ?? 'default',
        ...(payload.idempotencyKey ? { idempotencyKey: payload.idempotencyKey } : {}),
        ...(payload.wallet ? { wallet: payload.wallet } : {}),
      }),
    });
    return { response: result.data, latencyMs: result.latencyMs };
  },

  /** 服务端会话记录。后端按 siwe_user_id 存一条线性对话，没有会话 id 概念。 */
  async history(params: {
    token: string;
    before?: number;
    limit?: number;
  }): Promise<HistoryPage> {
    const search = new URLSearchParams();
    if (params.before !== undefined) search.set('before', String(params.before));
    if (params.limit !== undefined) search.set('limit', String(params.limit));
    const query = search.toString();
    const result = await request<HistoryPage>(
      `/api/v1/chat/history${query ? `?${query}` : ''}`,
      { timeoutMs: 15_000, headers: bearer(params.token) },
    );
    return result.data;
  },

  /** 清空该登录地址的全部服务端对话，并丢弃已生成的摘要。长期记忆与档案保留。 */
  async clear(token: string): Promise<ClearResult> {
    const result = await request<ClearResult>('/api/v1/chat/clear', {
      method: 'POST',
      timeoutMs: 15_000,
      headers: bearer(token),
    });
    return result.data;
  },

  /** 彻底删除该登录地址的全部数据：消息、摘要、档案、长期记忆。不可恢复。 */
  async purge(token: string): Promise<PurgeResult> {
    const result = await request<PurgeResult>('/api/v1/chat/memory', {
      method: 'DELETE',
      timeoutMs: 20_000,
      headers: bearer(token),
    });
    return result.data;
  },

  /** 第一步：拿 nonce 与后端生成好的 SIWE 消息。 */
  async authNonce(address: string, chainId: number): Promise<AuthNonce> {
    const result = await request<AuthNonce>('/api/v1/auth/nonce', {
      method: 'POST',
      timeoutMs: 15_000,
      body: JSON.stringify({ address, chainId }),
    });
    return result.data;
  },

  /** 第二步：把钱包签名回传，换 JWT。 */
  async authVerify(message: string, signature: string): Promise<AuthVerifyResult> {
    const result = await request<AuthVerifyResult>('/api/v1/auth/verify', {
      method: 'POST',
      timeoutMs: 20_000,
      body: JSON.stringify({ message, signature }),
    });
    return result.data;
  },

  async health(): Promise<RequestResult<HealthPayload>> {
    return request<HealthPayload>('/health', { timeoutMs: 8_000 });
  },

  async ready(): Promise<RequestResult<ReadyPayload>> {
    return request<ReadyPayload>('/health/ready', { timeoutMs: 25_000 });
  },
};

// Knowledge administration always calls the real backend. Never simulate publication.
export const ragApi = {
  async knowledgeBases(token: string, admin = true) {
    return (await request<{ data: { items: KnowledgeBase[] } }>(admin ? '/api/v1/rag/knowledge-bases' : '/api/v1/knowledge-bases', {
      headers: bearer(token), timeoutMs: 15_000,
    })).data.data.items;
  },
  async createKnowledgeBase(token: string, payload: { name: string; description: string }) {
    return (await request<{ data: KnowledgeBase }>('/api/v1/rag/knowledge-bases', {
      method:'POST',headers:bearer(token),body:JSON.stringify(payload),timeoutMs:15_000,
    })).data.data;
  },
  async updateKnowledgeBase(token: string, id: string, payload: { name?: string; description?: string; status?: 'active'|'disabled' }) {
    return (await request<{ data: KnowledgeBase }>(`/api/v1/rag/knowledge-bases/${encodeURIComponent(id)}`, {
      method:'PATCH',headers:bearer(token),body:JSON.stringify(payload),timeoutMs:15_000,
    })).data.data;
  },
  async upload(token: string, file: File, metadata: RagMetadata, key: string) {
    const body = new FormData();
    body.append('file', file);
    body.append('metadata', JSON.stringify(metadata));
    return (await request<{ data: RagJob; status_url: string; deduplicated: boolean }>('/api/v1/rag/documents', {
      method: 'POST', headers: { ...bearer(token), 'Idempotency-Key': key }, body,
    })).data;
  },
  async documents(token: string, offset = 0, kbId?: string) {
    return (await request<{ data: RagPage<RagDocument> }>(`/api/v1/rag/documents?limit=10&offset=${offset}${kbId ? `&kb_id=${encodeURIComponent(kbId)}` : ''}`, {
      headers: bearer(token), timeoutMs: 15_000,
    })).data.data;
  },
  async jobs(token: string, offset = 0, kbId?: string) {
    return (await request<{ data: RagPage<RagJob> }>(`/api/v1/rag/jobs?limit=10&offset=${offset}${kbId ? `&kb_id=${encodeURIComponent(kbId)}` : ''}`, {
      headers: bearer(token), timeoutMs: 15_000,
    })).data.data;
  },
  async job(token: string, id: string) {
    return (await request<{ data: RagJob }>(`/api/v1/rag/jobs/${encodeURIComponent(id)}`, {
      headers: bearer(token), timeoutMs: 15_000,
    })).data.data;
  },
  async retry(token: string, id: string) {
    return (await request<{ data: RagJob }>(`/api/v1/rag/jobs/${encodeURIComponent(id)}/retry`, {
      method: 'POST', headers: bearer(token), timeoutMs: 15_000,
    })).data.data;
  },
  async disable(token: string, id: string) {
    return (await request<{ data: { document_id: string; status: string } }>(`/api/v1/rag/documents/${encodeURIComponent(id)}/disable`, {
      method: 'POST', headers: bearer(token), timeoutMs: 15_000,
    })).data.data;
  },
  async search(token: string, payload: RagSearch) {
    return (await request<{ data: RagSearchResult }>('/api/v1/rag/search', {
      method: 'POST', headers: bearer(token), body: JSON.stringify(payload),
    })).data.data;
  },
};
