import { Spinner } from '@/components/ui/marks';

const STAGES = ['意图识别 · Ollama', '路由决策 · IntentRouter', '执行只读工具'];

export function ThinkingMessage() {
  return (
    <div className="flex gap-3" style={{ animation: 'rise-in 240ms ease-out' }}>
      <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-mint/20 bg-mint/[0.06]">
        <Spinner className="size-3.5 animate-spin text-mint" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-medium text-ink">链上助手</span>
          <span className="text-[11.5px] text-ink-3">正在处理…</span>
        </div>

        <div className="mt-2.5 space-y-1.5">
          {STAGES.map((stage, index) => (
            <div key={stage} className="flex items-center gap-2">
              <span className="w-[124px] shrink-0 font-mono text-[10px] text-ink-3">{stage}</span>
              <span
                className="h-[3px] flex-1 overflow-hidden rounded-full"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(79,227,193,0.42) 45%, rgba(139,123,255,0.34) 60%, rgba(255,255,255,0.05) 100%)',
                  backgroundSize: '220% 100%',
                  animation: `shimmer 2.1s ease-in-out ${index * 0.18}s infinite`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
