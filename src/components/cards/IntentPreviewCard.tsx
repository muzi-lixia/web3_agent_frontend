import { Button, Tooltip } from 'antd';
import { Chip, MonoCopy } from '@/components/ui/atoms';
import { actionLabel, isValidAddress } from '@/lib/format';
import { Shield } from '@/components/ui/marks';
import type { IntentPreview } from '@/types';

export function IntentPreviewCard({
  preview,
  riskTags = [],
  taskId,
}: {
  preview: IntentPreview;
  riskTags?: string[];
  taskId?: string | null;
}) {
  const isAddress = isValidAddress(preview.target);

  return (
    <section className="mt-3.5 overflow-hidden rounded-xl border border-warn/25 bg-warn/[0.035]">
      <div className="flex items-center gap-2 border-b border-warn/15 px-3.5 py-2">
        <span className="text-[11.5px] font-medium tracking-[0.14em] text-warn uppercase">
          意图回显 · 待确认
        </span>
        <Chip tone="danger" className="h-[20px]">
          写链路未接入
        </Chip>
        {taskId && <span className="ml-auto font-mono text-[10px] text-ink-3">{taskId}</span>}
      </div>

      <div className="grid gap-px bg-line/60 sm:grid-cols-2">
        <div className="bg-panel/70 px-3.5 py-2.5">
          <div className="text-[10px] text-ink-3">动作</div>
          <div className="mt-1 text-[13px] text-ink">{actionLabel(preview.action)}</div>
        </div>
        <div className="bg-panel/70 px-3.5 py-2.5">
          <div className="text-[10px] text-ink-3">代币</div>
          <div className="mt-1 font-mono text-[13px] text-ink">{preview.tokenSymbol}</div>
        </div>
        <div className="bg-panel/70 px-3.5 py-2.5">
          <div className="text-[10px] text-ink-3">数量</div>
          <div className="mt-1 font-mono text-[13px] tabular text-ink">{preview.humanAmount}</div>
        </div>
        <div className="min-w-0 bg-panel/70 px-3.5 py-2.5">
          <div className="text-[10px] text-ink-3">目标</div>
          <div className="mt-1 min-w-0 text-[13px] text-ink">
            {isAddress ? (
              <MonoCopy value={preview.target} display={preview.target} />
            ) : (
              <span className="font-mono">{preview.target}</span>
            )}
          </div>
        </div>
      </div>

      {riskTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 py-2.5">
          <span className="text-[10px] text-ink-3">风险标签</span>
          {riskTags.map((tag) => (
            <Chip key={tag} tone="warn" className="h-[20px] text-[10px]">
              {tag}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-warn/15 px-3.5 py-2.5">
        <Tooltip title="V1a 不生成 TxIntent，确认后也不会有任何链上动作">
          <Button size="small" type="primary" disabled>
            确认并生成交易
          </Button>
        </Tooltip>
        <Button size="small" disabled>
          拒绝执行
        </Button>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-ink-3">
          <Shield className="size-3" />
          后端只输出未签名意图，签名与广播始终在钱包侧
        </span>
      </div>
    </section>
  );
}
