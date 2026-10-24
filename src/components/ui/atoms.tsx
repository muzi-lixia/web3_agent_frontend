import { App as AntApp } from 'antd';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { CopyOutlined } from '@ant-design/icons';

type Tone = 'neutral' | 'mint' | 'mint-soft' | 'warn' | 'danger' | 'ok';

const TONE_STYLES: Record<Tone, string> = {
  neutral: 'border-line-strong/70 bg-white/[0.03] text-ink-2',
  mint: 'border-mint/25 bg-mint/[0.07] text-mint',
  'mint-soft': 'border-mint-soft/25 bg-mint-soft/[0.07] text-mint-soft',
  warn: 'border-warn/25 bg-warn/[0.07] text-warn',
  danger: 'border-danger/25 bg-danger/[0.07] text-danger',
  ok: 'border-ok/25 bg-ok/[0.07] text-ok',
};

export function Chip({
  children,
  tone = 'neutral',
  mono = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-[9px] py-[2px] text-[11.5px] leading-[16px] whitespace-nowrap',
        TONE_STYLES[tone],
        mono && 'font-mono tracking-tight',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  tone = 'ok',
  pulse = false,
  className,
}: {
  tone?: 'ok' | 'warn' | 'danger' | 'idle';
  pulse?: boolean;
  className?: string;
}) {
  const colors = {
    ok: 'bg-ok',
    warn: 'bg-warn',
    danger: 'bg-danger',
    idle: 'bg-ink-3',
  };
  return (
    <span
      className={clsx('inline-block size-[6px] shrink-0 rounded-full', colors[tone], className)}
      style={pulse ? { animation: 'pulse-dot 2.2s ease-in-out infinite' } : undefined}
    />
  );
}

export function SectionTitle({
  children,
  extra,
  className,
}: {
  children: ReactNode;
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-center justify-between gap-2', className)}>
      <span className="text-[11.5px] font-medium tracking-[0.18em] text-ink-3 uppercase">
        {children}
      </span>
      {extra}
    </div>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-mint to-mint-soft text-[11px] font-bold text-[#04170f]">
        W3
      </div>
      {!compact && (
        <div className="hidden leading-tight sm:block">
          <div className="text-[13px] font-semibold tracking-tight text-ink">链上助手</div>
          <div className="font-mono text-[11.5px] tracking-[0.16em] text-ink-3 uppercase">
            onchain agent
          </div>
        </div>
      )}
    </div>
  );
}

export function MonoCopy({
  value,
  display,
  className,
}: {
  value: string;
  display?: string;
  className?: string;
}) {
  const { message } = AntApp.useApp();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      message.success('已复制');
    } catch {
      message.error('复制失败，请手动选择文本');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={clsx(
        'group inline-flex max-w-full items-center gap-1.5 font-mono text-[13px] text-ink-2 transition hover:text-ink',
        className,
      )}
      title={value}
    >
      <span className="truncate">{display ?? value}</span>
      <CopyOutlined className="shrink-0 text-[13px] text-ink-3 transition group-hover:text-mint" />
    </button>
  );
}

export function KeyValue({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-baseline justify-between gap-3 py-1.5', className)}>
      <span className="shrink-0 text-[13px] text-ink-3">{label}</span>
      <span className="min-w-0 text-right text-[13px] text-ink-2">{children}</span>
    </div>
  );
}
