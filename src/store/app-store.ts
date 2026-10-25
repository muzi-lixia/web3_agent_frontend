import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  AuthSession,
  ChatData,
  ChatResponseType,
  IntentPreview,
  ToolCallRecord,
  WalletRef,
} from '@/types';
import { isValidAddress, chainMeta } from '@/lib/format';
import type { ChatStage } from '@/lib/api';

export interface MessageError {
  code: string;
  message: string;
  retryable: boolean;
  status: number;
  traceId?: string | null;
}

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  status: 'pending' | 'done' | 'error';
  /** 这一轮当前走到哪一步。只在 pending 期间有意义，用来替代笼统的「正在处理」。 */
  stage?: ChatStage;
  type?: ChatResponseType;
  data?: ChatData;
  toolCalls?: ToolCallRecord[];
  steps?: number;
  riskTags?: string[];
  intentPreview?: IntentPreview | null;
  taskId?: string | null;
  latencyMs?: number;
  error?: MessageError | null;
  source?: 'live' | 'mock';
  /** 这条消息的幂等键。重发同一条时沿用它，服务端才不会把同一轮跑两次。 */
  requestKey?: string;
}

/** 地址是扫码连来的还是手输的：只有前者能签名，后者只能做只读查询。 */
export type WalletSource = 'walletconnect' | 'manual';

/** 服务端历史的分页游标：earliestId 是已加载到的最早一条 id，往前翻页时当 before 用。 */
export interface HistoryPageState {
  hasMore: boolean;
  earliestId: number | null;
}

interface AppState {
  /** 后端按地址只存一条线性对话，前端也就只有一条，不再有会话列表。 */
  messages: UiMessage[];
  history: HistoryPageState;
  wallet: WalletRef | null;
  walletSource: WalletSource | null;
  auth: AuthSession | null;
  mockMode: boolean;
  knowledgeBaseId: string;
  setKnowledgeBaseId: (id: string) => void;
  walletOpen: boolean;

  appendMessage: (message: UiMessage) => void;
  patchMessage: (messageId: string, patch: Partial<UiMessage>) => void;
  /** 整条撤回：本轮被判定失效时，占位气泡要消失而不是留一个空白框。 */
  removeMessage: (messageId: string) => void;
  replaceMessages: (messages: UiMessage[]) => void;
  /** 往前翻页：更早的记录插在队首，不参与 MAX_MESSAGES 的尾部截断。 */
  prependMessages: (messages: UiMessage[]) => void;
  clearConversation: () => void;
  setHistoryPage: (patch: Partial<HistoryPageState>) => void;
  setWallet: (wallet: WalletRef | null, source?: WalletSource) => void;
  setAuth: (auth: AuthSession | null) => void;
  setMockMode: (enabled: boolean) => void;
  openWallet: () => void;
  closeWallet: () => void;
}

const MAX_MESSAGES = 200;

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/** 取首句用户提问当标题，够长就截断。 */
export function conversationTitle(messages: UiMessage[]): string {
  const first = messages.find((message) => message.role === 'user');
  const cleaned = first?.content.replace(/\s+/g, ' ').trim() ?? '';
  if (!cleaned) return '当前对话';
  return cleaned.length > 22 ? `${cleaned.slice(0, 22)}…` : cleaned;
}

/** v1 的多会话持久化结构，只在迁移时读一次。 */
interface LegacyState {
  sessions?: Array<{ id: string; messages: UiMessage[] }>;
  activeSessionId?: string | null;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      knowledgeBaseId: 'default',
      setKnowledgeBaseId: (knowledgeBaseId) => set({ knowledgeBaseId }),
      messages: [],
      history: { hasMore: false, earliestId: null },
      wallet: null,
      walletSource: null,
      auth: null,
      mockMode: (import.meta.env.VITE_USE_MOCK ?? 'false') === 'true',
      walletOpen: false,

      appendMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message].slice(-MAX_MESSAGES) })),

      patchMessage: (messageId, patch) =>
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === messageId ? { ...message, ...patch } : message,
          ),
        })),

      /** 用服务端记录整体覆盖：服务端才是对话的唯一事实来源。 */
      replaceMessages: (messages) => set({ messages: messages.slice(-MAX_MESSAGES) }),

      removeMessage: (messageId) =>
        set((state) => ({ messages: state.messages.filter((message) => message.id !== messageId) })),

      prependMessages: (messages) =>
        set((state) => {
          // 服务端分页已经限制了总量，这里不截断队首 —— 截掉就等于抹掉刚翻出来的历史
          const known = new Set(state.messages.map((message) => message.id));
          const fresh = messages.filter((message) => !known.has(message.id));
          return { messages: [...fresh, ...state.messages] };
        }),

      clearConversation: () =>
        set({ messages: [], history: { hasMore: false, earliestId: null } }),

      setHistoryPage: (patch) =>
        set((state) => ({ history: { ...state.history, ...patch } })),

      setWallet: (wallet, source = 'manual') =>
        set((state) => {
          const next =
            wallet && isValidAddress(wallet.address)
              ? { address: wallet.address.trim(), chainId: wallet.chainId }
              : null;
          // 换地址等于换身份：旧 JWT 绑的是上一个地址，必须一起清掉。
          const sameAccount =
            next !== null &&
            state.auth !== null &&
            state.auth.address.toLowerCase() === next.address.toLowerCase();
          if (sameAccount) {
            return { wallet: next, walletSource: next ? source : null, auth: state.auth };
          }
          // 消息与分页必须在同一次更新里清干净。只清 auth 的话，
          // 新身份历史为空时同步逻辑会直接返回（不能拿空结果覆盖用户刚输入的内容），
          // 上一账户的消息就一直留在新账户界面上了。
          return {
            wallet: next,
            walletSource: next ? source : null,
            auth: null,
            messages: [],
            history: { hasMore: false, earliestId: null },
            knowledgeBaseId: 'default',
          };
        }),

      /** 未登录就不该留下上一次的对话：JWT 一失效，消息与分页游标一起清。 */
      setAuth: (auth) =>
        set((state) => ({
          auth,
          knowledgeBaseId:
            state.auth?.address.toLowerCase() === auth?.address.toLowerCase()
              ? state.knowledgeBaseId
              : 'default',
          ...(auth === null
            ? { messages: [], history: { hasMore: false, earliestId: null } }
            : {}),
        })),

      setMockMode: (enabled) => set({ mockMode: enabled }),

      openWallet: () => set({ walletOpen: true }),
      closeWallet: () => set({ walletOpen: false }),
    }),
    {
      name: 'web3-agent-console',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      /**
       * 只持久化登录期的东西。没有有效 JWT 时一律留空，
       * 地址、消息、登录态都不落盘，刷新后既恢复不出内容、也不留残影。
       */
      partialize: (state) => {
        const alive = Boolean(state.auth && state.auth.expiresAt > Date.now());
        return {
          messages: alive ? state.messages : [],
          wallet: alive ? state.wallet : null,
          walletSource: alive ? state.walletSource : null,
          auth: alive ? state.auth : null,
          mockMode: state.mockMode,
        } as unknown as AppState;
      },

      /** 读盘时再挡一次：旧版本留在本地的数据，登录态已失效就整体丢弃。 */
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<AppState>;
        const alive = Boolean(stored.auth && stored.auth.expiresAt > Date.now());
        if (!alive) return { ...current, mockMode: stored.mockMode ?? current.mockMode };
        return {
          ...current,
          ...stored,
          // 分页游标是会话内的临时状态，不跟着持久化走
          history: { hasMore: false, earliestId: null },
        };
      },
      /** v1 是多会话，取当前激活那一会话的消息续上，别让升级等于清空。 */
      migrate: (persisted, version) => {
        if (version >= 2) return persisted as AppState;
        const legacy = (persisted ?? {}) as LegacyState & Record<string, unknown>;
        const active =
          legacy.sessions?.find((session) => session.id === legacy.activeSessionId) ??
          legacy.sessions?.[0];
        const { sessions: _sessions, activeSessionId: _active, ...rest } = legacy;
        return { ...rest, messages: active?.messages ?? [] } as AppState;
      },
    },
  ),
);

export function walletLabel(wallet: WalletRef | null): string {
  if (!wallet) return '未连接钱包';
  return `${chainMeta(wallet.chainId).short} · ${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`;
}
