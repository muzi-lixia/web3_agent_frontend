import { Chip } from '@/components/ui/atoms';
import { ArrowRight, Check, Cross } from '@/components/ui/marks';

const PROMPTS = [
  { label: '查一下我的多链资产', hint: '按后端白名单链逐条扫描', text: '查一下我的多链资产余额' },
  { label: '最近的交易记录', hint: '合并普通与 ERC20，去重排序', text: '查看最近的 10 笔交易记录' },
  { label: '我在 A 质押池的仓位', hint: '质押数量、待领奖励、锁定期', text: '查看我在 A 质押池的质押仓位' },
  { label: '转 0.1 ETH 给 0xbbbb…', hint: '观察写意图如何被拦在回显阶段', text: '转 0.1 ETH 给 0xbbbbcccc11112222333344445555666677778888' },
];

export function EmptyState({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <div className="flex w-full flex-1 flex-col justify-center py-8 lg:py-10">
      <div>
        <Chip tone="mint">V1a · 只读链路</Chip>
      </div>

      <h1 className="mt-5 text-[24px] leading-[1.18] font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
        把链上仓位
        <br />
        <span className="text-mint">问出来。</span>
      </h1>

      <p className="mt-4 max-w-[520px] text-[13px] leading-relaxed text-ink-2">
        用自然语言查询余额、交易记录与质押仓位。只读查询可跨白名单链自动扫描；后端不接触私钥，也不生成任何签名。
      </p>

      <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
        {PROMPTS.map((prompt, index) => (
          <button
            key={prompt.label}
            type="button"
            onClick={() => onPrompt(prompt.text)}
            className="group flex items-start gap-3 rounded-xl border border-line bg-panel/50 px-3.5 py-3 text-left transition hover:border-mint/25 hover:bg-mint/[0.035]"
          >
            <span className="pt-[3px] font-mono text-[10px] text-ink-3">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-ink">{prompt.label}</span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">
                {prompt.hint}
              </span>
            </span>
            <ArrowRight className="mt-1 size-3.5 shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-mint" />
          </button>
        ))}
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line/70 pt-4 text-[11.5px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <Check className="size-3 text-ok" />
          余额 / 交易 / 质押 只读
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Cross className="size-3 text-ink-3" />
          转账 / 授权 / 质押 写操作未接入
        </span>
        <span className="ml-auto font-mono text-[10px]">PRD V1.5 · 架构 v0.8</span>
      </div>
    </div>
  );
}
