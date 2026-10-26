import { Chip, KeyValue, SectionTitle, StatusDot } from '@/components/ui/atoms';
import { DataPrivacy } from '@/components/layout/DataPrivacy';
import { useBackendHealth } from '@/hooks/use-health';
import { formatLatency, chainMeta } from '@/lib/format';
import { useAppStore } from '@/store/app-store';

export function Inspector() {
  const { status } = useBackendHealth();
  const mockMode = useAppStore((state) => state.mockMode);

  const online = status?.online ?? false;
  // /health 会连一次 pg：请求 200 但 db=false 时是 degraded，不能当健康的 online 显示
  const degraded = online && status?.health?.status === 'degraded';

  return (
    <aside className="hidden w-[318px] shrink-0 flex-col overflow-y-auto border-l border-line bg-panel px-4 py-4 xl:flex">
      <SectionTitle>运行环境</SectionTitle>
      <div className="mt-1.5 divide-y divide-line/40">
        <KeyValue label="后端 API">
          <span className="inline-flex items-center gap-1.5">
            <StatusDot tone={online ? (degraded ? 'warn' : 'ok') : 'danger'} pulse={online && !degraded} />
            {online ? (degraded ? 'degraded' : 'online') : 'offline'}
          </span>
        </KeyValue>
        <KeyValue label="响应延迟">
          <span className="font-mono text-[13px]">
            {online ? formatLatency(status?.latencyMs) : '—'}
          </span>
        </KeyValue>
        <KeyValue label="模型">
          <span className="font-mono text-[11.5px]">
            {status?.health?.model ?? (mockMode ? 'mock' : '—')}
          </span>
        </KeyValue>
        <KeyValue label="模型就绪">
          <Chip
            tone={
              status?.ready === 'ready' ? 'ok' : status?.ready === 'not_ready' ? 'danger' : 'neutral'
            }
            className="h-[22px] text-[11.5px]"
          >
            {status?.ready ?? 'unknown'}
          </Chip>
        </KeyValue>
        <KeyValue label="数据库">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px]">
            <StatusDot tone={status?.health?.db ? 'ok' : 'warn'} />
            {status?.health?.db ? 'pg ok' : 'unknown'}
          </span>
        </KeyValue>
        <KeyValue label="LangSmith">
          <span className="font-mono text-[11.5px]">
            {status?.health?.langsmith ? 'tracing on' : 'off'}
          </span>
        </KeyValue>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {(status?.health?.chains ?? []).map((chainId) => (
          <Chip key={chainId} tone="neutral" mono className="text-[11.5px]">
            {chainMeta(chainId).short} · {chainId}
          </Chip>
        ))}
        {(status?.health?.chains ?? []).length === 0 && (
          <span className="text-[11.5px] text-ink-3">链白名单未读取到</span>
        )}
      </div>

      <div className="my-4 h-px bg-line/70" />

      <DataPrivacy />
    </aside>
  );
}
