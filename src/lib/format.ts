import { CHAINS, type SupportedChainId } from '@/types';

const EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io',
  56: 'https://bscscan.com',
  137: 'https://polygonscan.com',
  80094: 'https://berascan.com',
};

export function chainMeta(chainId: number) {
  return CHAINS.find((chain) => chain.id === chainId) ?? { id: chainId, name: `Chain ${chainId}`, short: `#${chainId}`, symbol: '—' };
}

export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return CHAINS.some((chain) => chain.id === chainId);
}

export function truncateMiddle(value: string, head = 6, tail = 4): string {
  if (!value) return '—';
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function shortHash(hash: string): string {
  return truncateMiddle(hash, 8, 6);
}

/**
 * raw 最小单位 → 人读金额。全程 BigInt，不经过浮点（PRD 6.5）。
 */
export function formatRawAmount(raw: string, decimals: number, maxFractionDigits = 4): string {
  const input = raw?.trim() ?? '';
  if (!/^-?\d+$/.test(input)) return '—';

  const negative = input.startsWith('-');
  const digits = (negative ? input.slice(1) : input).replace(/^0+(?=\d)/, '') || '0';
  const scale = Math.max(0, decimals);
  const padded = digits.padStart(scale + 1, '0');

  const integerPart = padded.slice(0, padded.length - scale);
  let fractionPart = scale > 0 ? padded.slice(padded.length - scale) : '';

  if (maxFractionDigits >= 0 && fractionPart.length > maxFractionDigits) {
    fractionPart = fractionPart.slice(0, maxFractionDigits);
  }
  fractionPart = fractionPart.replace(/0+$/, '');

  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}${fractionPart ? `.${fractionPart}` : ''}`;
}

export function formatLatency(ms?: number): string {
  if (ms === undefined || ms === null) return '';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 172_800_000) return '昨天';
  return new Date(timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

export function formatUnixSeconds(unix?: string | null): string {
  if (!unix) return '';
  const seconds = Number(unix);
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  return new Date(seconds * 1000).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function explorerTxUrl(chainId: number, hash: string): string | null {
  const base = EXPLORERS[chainId];
  return base ? `${base}/tx/${hash}` : null;
}

export function explorerAddressUrl(chainId: number, address: string): string | null {
  const base = EXPLORERS[chainId];
  return base ? `${base}/address/${address}` : null;
}

const ACTION_LABELS: Record<string, string> = {
  transfer: '转账',
  approve: '授权',
  revoke_approve: '撤销授权',
  stake: '质押',
  query_balance: '余额查询',
  query_transactions: '交易记录查询',
  query_stake: '质押仓位查询',
  read: '只读查询',
  answer: '问答',
  reject: '能力边界',
};

export function actionLabel(action?: string): string {
  if (!action) return '—';
  return ACTION_LABELS[action] ?? action;
}

const OP_LABELS: Record<string, string> = {
  gt: '大于',
  gte: '不低于',
  lt: '小于',
  lte: '不高于',
  eq: '等于',
};

export function opLabel(op?: string): string {
  if (!op) return '';
  return OP_LABELS[op] ?? op;
}

export function isValidAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}
