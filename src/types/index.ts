import type { RagHit } from "./rag";

/**
 * 与 PRD V1.5 第 6/7 章对齐的前端契约。
 * 后端当前只返回 steps + toolCalls；资产 / 交易 / 质押三类结构化字段是
 * 前端预留的扩展位（见 data 注释），后端补齐后即可直接消费。
 */

/** 已知链的展示名。真正的可选范围以 /health 返回的 whitelist 为准（配置驱动，不硬编码）。 */
export const CHAINS = [
  { id: 1, name: 'Ethereum', short: 'ETH', symbol: 'ETH' },
  { id: 56, name: 'BNB Chain', short: 'BSC', symbol: 'BNB' },
  { id: 137, name: 'Polygon', short: 'POL', symbol: 'POL' },
  { id: 80094, name: 'Berachain', short: 'BERA', symbol: 'BERA' },
] as const;

export type SupportedChainId = (typeof CHAINS)[number]['id'];

export interface WalletRef {
  address: string;
  chainId: number;
}

/** POST /auth/nonce 的响应：message 由后端按 EIP-4361 生成，前端原样交给钱包签。 */
export interface AuthNonce {
  nonce: string;
  expiresIn: number;
  message: string;
}

/** POST /auth/verify 的响应。expiresIn 是 JWT 剩余秒数。 */
export interface AuthVerifyResult {
  token: string;
  siweAddress: string;
  siweAddressShort: string;
  expiresIn: number;
}

/** 本地持有的登录态：token + 展示用信息，expiresAt 用毫秒时间戳。 */
export interface AuthSession {
  token: string;
  address: string;
  shortAddress: string;
  /** JWT 里绑定的链；与当前钱包网络不一致时后端会回 E509 */
  chainId: number;
  expiresAt: number;
}

/** GET /chat/history 的单条记录。role 只有 user / assistant。 */
export interface HistoryItem {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  /** 该轮的工具轨迹，结构与 /chat 的 data.toolCalls 一致；没调工具时为 null。 */
  toolCalls?: ToolCallRecord[] | null;
  citations?: RagHit[];
  createdAt: string;
}

export interface HistoryPage {
  items: HistoryItem[];
  hasMore: boolean;
}

/** POST /chat/clear 的响应。 */
export interface ClearResult {
  clearedMessages: number;
  clearedSummary: boolean;
  startedAt: string;
}

/** DELETE /chat/memory 的响应：合规删除，连长期记忆与档案一起删，不可恢复。 */
export interface PurgeResult {
  deletedMessages: number;
  deletedSummaries: number;
  deletedProfile: boolean;
  deletedMemories: number;
  deletedAt: string;
}

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  error?: string | null;
  latency_ms?: number;
  latencyMs?: number;
}

export interface TokenAsset {
  chainId: number;
  symbol: string;
  name?: string;
  decimals: number;
  /** 链上最小单位，十进制字符串 */
  balanceRaw: string;
  isNative?: boolean;
  tokenAddress?: string;
}

export interface ChainAssetGroup {
  chainId: number;
  items: TokenAsset[];
  /** 单链失败只标记该链，不影响整体（PRD 1.4） */
  error?: string | null;
}

export interface TxRecord {
  chainId: number;
  hash: string;
  blockTime: number;
  from: string;
  to: string;
  direction: 'in' | 'out' | 'self';
  amountRaw: string;
  decimals: number;
  symbol: string;
  type: 'native' | 'erc20' | 'internal';
  status: 'success' | 'failed' | 'pending';
}

export interface StakePositionView {
  chainId: number;
  tokenSymbol: string;
  decimals: number;
  /** raw 十进制字符串（PRD 6.2） */
  stakedAmount: string;
  pendingReward: string;
  unlockAt?: string | null;
  positionStatus: 'active' | 'locked';
  contractStatus: 'active' | 'paused' | 'deprecated';
  rewardMode: 'accrued' | 'rebasing' | 'none';
  alias?: string;
  contractAddress?: string;
}

export interface TxIntent {
  chainId: number;
  from: string;
  to: string;
  value: string;
  data: string;
  method: string;
  meta: {
    humanReadableSummary: string;
    estimatedGasLimit: string;
    riskTags: string[];
    createdAt: number;
    expiresAt: number;
  };
}

export interface IntentPreview {
  action: string;
  tokenSymbol: string;
  humanAmount: string;
  target: string;
}

export type ChatResponseType = 'answer' | 'ask' | 'intent_confirm' | 'tx_preview';

export interface ChatData {
  citations?: RagHit[];
  steps?: number;
  toolCalls?: ToolCallRecord[];
  /** 本轮读取历史后被清空：答案作废，不落库也不上屏。 */
  discarded?: boolean;
  /** 扩展位：多链资产，每链 topN */
  assets?: ChainAssetGroup[];
  /** 扩展位：交易记录 */
  transactions?: TxRecord[];
  /** 扩展位：质押仓位 */
  stakePosition?: StakePositionView;
  /** 后端模板渲染的提示语，前端原样展示 */
  notices?: string[];
}

export interface ChatResponse {
  type: ChatResponseType;
  content: string;
  data: ChatData;
  taskId?: string | null;
  intentPreview?: IntentPreview | null;
  txIntent?: TxIntent | null;
  riskTags?: string[];
}

export interface ApiErrorBody {
  errorCode: string;
  errorMsg: string;
  retryable?: boolean;
  httpStatus?: number;
}

export interface WorkflowStatus {
  taskId: string;
  state: string;
  expireType: 'NONE' | 'EXPIRED_UNSIGNED' | 'EXPIRED_UNVERIFIED';
  siweAddressShort: string;
  txIntent: TxIntent | null;
  errorCode: string | null;
  errorMsg: string | null;
  expiresAt: number;
}

export interface HealthPayload {
  status: 'ok' | 'degraded';
  db: boolean;
  chains: number[];
  langsmith: boolean;
  model: string;
}

export interface ReadyPayload {
  status: 'ready' | 'not_ready';
  reason?: string;
}
