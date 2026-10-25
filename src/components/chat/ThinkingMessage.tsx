import { Spinner } from '@/components/ui/marks';
import type { ChatStage } from '@/lib/api';

/** 阶段文案。后端只发标识，措辞归界面决定。 */
const STAGE_TEXT: Record<ChatStage, string> = {
  intent: '正在理解你的问题',
  query: '正在查询链上数据',
  plan: '正在按计划执行',
  write: '正在准备待签交易',
};

export function ThinkingMessage({ stage }: { stage?: ChatStage }) {
  return (
    <div className="flex gap-3" style={{ animation: 'rise-in 240ms ease-out' }}>
      <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-mint/20 bg-mint/[0.06]">
        <Spinner className="size-3.5 animate-spin text-mint" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-medium text-ink">链上助手</span>
          <span className="text-[11.5px] text-ink-3">
            {stage ? STAGE_TEXT[stage] : '正在处理…'}
          </span>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <span
            className="h-[3px] flex-1 overflow-hidden rounded-full"
            style={{
              backgroundImage:
                'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(79,227,193,0.42) 45%, rgba(139,123,255,0.34) 60%, rgba(255,255,255,0.05) 100%)',
              backgroundSize: '220% 100%',
              animation: 'shimmer 2.1s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}
