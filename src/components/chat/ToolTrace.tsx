import clsx from 'clsx';
import { useState } from 'react';

import { ChevronDown, Terminal } from '@/components/ui/marks';
import { Chip, StatusDot } from '@/components/ui/atoms';
import { formatLatency } from '@/lib/format';
import type { ToolCallRecord } from '@/types';

export function ToolTrace({
  calls,
  steps,
}: {
  calls: ToolCallRecord[];
  steps?: number;
}) {
  const failed = calls.filter((call) => !call.ok).length;
  const [open, setOpen] = useState(() => calls.some((call) => !call.ok));
  const totalLatency = calls.reduce((sum, call) => sum + (call.latency_ms ?? call.latencyMs ?? 0), 0);

  if (calls.length === 0) return null;

  return (
    <div className="mt-2.5 overflow-hidden rounded-lg border border-line bg-white/[0.014]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-white/[0.025]"
      >
        <Terminal className="size-3.5 shrink-0 text-ink-3" />
        <span className="text-[11.5px] text-ink-2">工具轨迹</span>
        <Chip tone="neutral" className="h-[20px] px-1.5 text-[10px]">
          {calls.length} 次调用
        </Chip>
        {typeof steps === 'number' && steps > 0 && (
          <span className="font-mono text-[10px] text-ink-3">{steps} 步</span>
        )}
        {failed > 0 && (
          <Chip tone="danger" className="h-[20px] px-1.5 text-[10px]">
            {failed} 失败
          </Chip>
        )}
        <span className="ml-auto font-mono text-[10px] text-ink-3">
          {formatLatency(totalLatency)}
        </span>
        <ChevronDown
          className={clsx('size-3 shrink-0 text-ink-3 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t border-line/70">
          {calls.map((call, index) => (
            <div
              key={`${call.name}-${index}`}
              className="border-b border-line/50 px-3 py-2 last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-ink-3">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="font-mono text-[11.5px] text-mint-soft">{call.name}</span>
                <StatusDot tone={call.ok ? 'ok' : 'danger'} />
                {call.error && (
                  <span className="truncate text-[10px] text-danger">{call.error}</span>
                )}
                <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-3">
                  {formatLatency(call.latency_ms ?? call.latencyMs)}
                </span>
              </div>
              {call.args && Object.keys(call.args).length > 0 && (
                <pre className="mt-1.5 overflow-x-auto rounded-md border border-line/60 bg-void/50 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-ink-2">
                  {JSON.stringify(call.args, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
