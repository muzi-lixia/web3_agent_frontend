import { useEffect, useRef, useState } from 'react';
import { App as AntApp } from 'antd';

import { Chip } from '@/components/ui/atoms';
import { Check, Warning } from '@/components/ui/marks';
import { Markdown } from '@/components/chat/Markdown';
import { CitationSources } from '@/components/chat/CitationSources';
import { ToolTrace } from '@/components/chat/ToolTrace';
import { ThinkingMessage } from '@/components/chat/ThinkingMessage';
import { ErrorNotice } from '@/components/chat/ErrorNotice';
import { AssetBalanceCards } from '@/components/cards/AssetBalanceCards';
import { TxRecordList } from '@/components/cards/TxRecordList';
import { StakePositionCard } from '@/components/cards/StakePositionCard';
import { IntentPreviewCard } from '@/components/cards/IntentPreviewCard';
import { formatClock, formatLatency } from '@/lib/format';
import type { UiMessage } from '@/store/app-store';
import type { WalletRef } from '@/types';

function AgentAvatar({ dimmed = false }: { dimmed?: boolean }) {
  return (
    <div
      className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border ${
        dimmed
          ? 'border-line bg-white/[0.02] text-ink-3'
          : 'border-mint/20 bg-gradient-to-br from-mint/[0.12] to-mint-soft/[0.12] text-mint'
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" aria-hidden>
        <path d="M12 4 18.5 7.8v8.4L12 20 5.5 16.2V7.8z" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
        <circle cx="12" cy="12" r="1.9" fill="currentColor" />
        <circle cx="12" cy="7.6" r="1.1" fill="currentColor" opacity="0.7" />
        <circle cx="12" cy="16.4" r="1.1" fill="currentColor" opacity="0.7" />
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-line-strong bg-panel-3 text-ink-2">
      <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" aria-hidden>
        <circle cx="12" cy="9.2" r="3.1" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M5.9 19.2c.7-3 3.1-4.7 6.1-4.7s5.4 1.7 6.1 4.7"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const { message: toast } = AntApp.useApp();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('已复制到剪贴板');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('复制失败，请手动选择文本');
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? '已复制' : '复制内容'}
      aria-label={copied ? '已复制' : '复制内容'}
      className={`inline-flex items-center gap-1 rounded-full text-ink-3 transition hover:text-mint ${className ?? ''}`}
    >
      {copied ? <Check className="size-3" /> : <CopyGlyph />}
      {label && <span>{copied ? '已复制' : label}</span>}
    </button>
  );
}

function CopyGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
      aria-hidden
    >
      <rect x="5.4" y="5.4" width="8" height="8" rx="1.8" />
      <path d="M10.6 3.4A1.8 1.8 0 0 0 8.8 2.6H4.2a1.6 1.6 0 0 0-1.6 1.6v4.6c0 .7.4 1.3 1 1.6" />
    </svg>
  );
}

const TYPE_CHIP = {
  ask: { label: '追问', tone: 'warn' as const },
  intent_confirm: { label: '意图回显', tone: 'warn' as const },
  tx_preview: { label: '交易预览', tone: 'danger' as const },
  answer: null,
};

export function MessageItem({
  message,
  wallet,
  onRetry,
}: {
  message: UiMessage;
  wallet: WalletRef | null;
  onRetry?: () => void;
}) {
  if (message.role === 'user') {
    return (
      <div
        className="flex justify-end gap-3"
        style={{ animation: 'rise-in 200ms ease-out' }}
      >
        <div className="flex min-w-0 max-w-[82%] flex-col items-end">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-[10px] text-ink-3">
              {formatClock(message.createdAt)}
            </span>
            <span className="text-[11.5px] font-medium text-ink">我</span>
            <CopyButton text={message.content} className="p-0.5" />
          </div>
          <div className="max-w-full rounded-xl rounded-tr-sm border border-mint/30 bg-mint/[0.13] px-3.5 py-2.5 text-[13px] leading-relaxed break-words whitespace-pre-wrap text-[#d9f6e6]">
            {message.content}
          </div>
        </div>
        <UserAvatar />
      </div>
    );
  }

  if (message.status === 'pending') return <ThinkingMessage />;

  const typeChip = message.type ? TYPE_CHIP[message.type] : null;
  const notices = message.data?.notices ?? [];
  const hasBody =
    Boolean(message.content) ||
    Boolean(message.intentPreview) ||
    Boolean(message.data?.assets?.length) ||
    Boolean(message.data?.transactions?.length) ||
    Boolean(message.data?.stakePosition) ||
    Boolean(message.toolCalls?.length) ||
    Boolean(message.data?.citations?.length);

  return (
    <div className="group flex gap-3" style={{ animation: 'rise-in 240ms ease-out' }}>
      <AgentAvatar dimmed={message.status === 'error'} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11.5px] font-medium text-ink">链上助手</span>
          <span className="font-mono text-[10px] text-ink-3">{formatClock(message.createdAt)}</span>
          {typeChip && (
            <Chip tone={typeChip.tone} className="h-[20px] px-1.5 text-[10px]">
              {typeChip.label}
            </Chip>
          )}
          {typeof message.steps === 'number' && message.steps > 0 && (
            <span className="font-mono text-[10px] text-ink-3">{message.steps} 步</span>
          )}
          {typeof message.latencyMs === 'number' && message.latencyMs > 0 && (
            <span className="font-mono text-[10px] text-ink-3">
              {formatLatency(message.latencyMs)}
            </span>
          )}
          {message.source === 'mock' && (
            <Chip tone="mint" className="h-[20px] px-1.5 text-[10px]">
              MOCK
            </Chip>
          )}
        </div>

        {notices.map((notice) => (
          <div
            key={notice}
            className="mt-2 flex items-start gap-2 rounded-lg border border-warn/20 bg-warn/[0.05] px-2.5 py-1.5"
          >
            <Warning className="mt-[2px] size-3 shrink-0 text-warn" />
            <span className="text-[11.5px] leading-relaxed text-warn/90">{notice}</span>
          </div>
        ))}

        {message.status === 'error' && message.error ? (
          <ErrorNotice error={message.error} onRetry={onRetry} />
        ) : hasBody ? (
          <div className="group/box relative mt-3 rounded-xl border border-line bg-panel-2 px-4 py-3">
            {message.content && (
              <CopyButton
                text={message.content}
                label="复制"
                className="absolute -top-3 right-3 h-6 border border-line-strong bg-panel-2 px-2 text-[10px] opacity-0 transition group-hover/box:opacity-100 hover:border-mint/45 focus-visible:opacity-100"
              />
            )}

            {message.content && <Markdown content={message.content} />}

            {message.intentPreview && (
              <IntentPreviewCard
                preview={message.intentPreview}
                riskTags={message.riskTags}
                taskId={message.taskId}
              />
            )}

            {message.data?.assets && message.data.assets.length > 0 && (
              <AssetBalanceCards groups={message.data.assets} wallet={wallet} />
            )}

            {message.data?.transactions && message.data.transactions.length > 0 && (
              <TxRecordList records={message.data.transactions} />
            )}

            {message.data?.stakePosition && (
              <StakePositionCard position={message.data.stakePosition} />
            )}

            <CitationSources citations={message.data?.citations ?? []} />

            <ToolTrace calls={message.toolCalls ?? []} steps={message.steps} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
