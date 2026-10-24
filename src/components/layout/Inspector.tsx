import { Chip, KeyValue, MonoCopy, SectionTitle, StatusDot } from '@/components/ui/atoms';
import { Check, Cross } from '@/components/ui/marks';
import { DataPrivacy } from '@/components/layout/DataPrivacy';
import { useBackendHealth } from '@/hooks/use-health';
import { apiBaseLabel } from '@/lib/api';
import { formatLatency, chainMeta } from '@/lib/format';
import { useAppStore } from '@/store/app-store';

const ENDPOINTS = [
  { method: 'POST', path: '/api/v1/auth/nonce', ready: true, note: 'SIWE' },
  { method: 'POST', path: '/api/v1/auth/verify', ready: true, note: 'SIWE' },
  { method: 'POST', path: '/api/v1/chat', ready: true, note: '需登录' },
  { method: 'GET', path: '/api/v1/chat/history', ready: true, note: '需登录' },
  { method: 'POST', path: '/api/v1/chat/clear', ready: true, note: '需登录' },
  { method: 'DELETE', path: '/api/v1/chat/memory', ready: true, note: '合规删除' },
  { method: 'POST', path: '/api/v1/intent/confirm', ready: false, note: '写链路' },
  { method: 'GET', path: '/api/v1/workflow/:taskId', ready: false, note: '写链路' },
  { method: 'POST', path: '/api/v1/tx/report', ready: false, note: '写链路' },
];

export function Inspector() {
  const { status } = useBackendHealth();
  const mockMode = useAppStore((state) => state.mockMode);
  const wallet = useAppStore((state) => state.wallet);
  const messages = useAppStore((state) => state.messages);
  const hasEarlier = useAppStore((state) => state.history.hasMore);

  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant');
  const online = status?.online ?? false;
  // /health 会连一次 pg：请求 200 但 db=false 时是 degraded，不能当健康的 online 显示
  const degraded = online && status?.health?.status === 'degraded';

  return (
    <aside className="hidden w-[318px] shrink-0 flex-col overflow-y-auto border-l border-line bg-panel px-4 py-4 xl:flex">
      {mockMode && (
        <div className="mb-4 rounded-lg border border-mint-soft/25 bg-mint-soft/[0.06] px-2.5 py-2 text-[11.5px] leading-relaxed text-mint-soft">
          Mock 模式：所有回答来自前端假数据，不会发起任何网络请求。
        </div>
      )}

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

      <SectionTitle>本次请求</SectionTitle>
      {lastAssistant ? (
        <div className="mt-1.5 divide-y divide-line/40">
          <KeyValue label="接口">
            <span className="font-mono text-[11.5px]">POST /api/v1/chat</span>
          </KeyValue>
          <KeyValue label="状态">
            <Chip
              tone={
                lastAssistant.status === 'error'
                  ? 'danger'
                  : lastAssistant.status === 'pending'
                    ? 'warn'
                    : 'ok'
              }
              className="h-[22px] text-[11.5px]"
            >
              {lastAssistant.status}
            </Chip>
          </KeyValue>
          <KeyValue label="耗时">
            <span className="font-mono text-[11.5px]">
              {lastAssistant.latencyMs ? formatLatency(lastAssistant.latencyMs) : '—'}
            </span>
          </KeyValue>
          <KeyValue label="工具步数">
            <span className="font-mono text-[11.5px]">
              {lastAssistant.steps ?? 0} / 5
            </span>
          </KeyValue>
          <KeyValue label="数据来源">
            <span className="font-mono text-[11.5px]">
              {lastAssistant.source === 'mock' ? 'mock' : 'live'}
            </span>
          </KeyValue>
          <KeyValue label="错误码">
            <span className="font-mono text-[11.5px]">
              {lastAssistant.error?.code ?? 'null'}
            </span>
          </KeyValue>
        </div>
      ) : (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
          发一条消息后，这里会显示最近一次请求的状态、耗时与工具步数。
        </p>
      )}

      {wallet && (
        <div className="mt-3 rounded-lg border border-line bg-white/[0.015] px-2.5 py-2">
          <div className="text-[11.5px] tracking-[0.12em] text-ink-3 uppercase">wallet.address</div>
          <MonoCopy value={wallet.address} className="mt-1" />
        </div>
      )}

      <div className="mt-2 flex items-center justify-between rounded-lg border border-line bg-white/[0.015] px-2.5 py-2">
        <span className="text-[11.5px] tracking-[0.12em] text-ink-3 uppercase">conversation</span>
        <span className="font-mono text-[11.5px] text-ink-2">
          {messages.length} msg · {hasEarlier ? '更早有记录' : '单会话'}
        </span>
      </div>

      <div className="my-4 h-px bg-line/70" />

      <DataPrivacy />

      <div className="my-4 h-px bg-line/70" />

      <SectionTitle extra={<span className="font-mono text-[11.5px] text-ink-3">后端当前状态</span>}>
        接口就绪度
      </SectionTitle>
      <div className="mt-2 space-y-1">
        {ENDPOINTS.map((endpoint) => (
          <div key={endpoint.path} className="flex items-center gap-2 py-[3px]">
            <span
              className={`grid size-4 shrink-0 place-items-center rounded ${
                endpoint.ready ? 'bg-ok/10 text-ok' : 'bg-white/[0.03] text-ink-3'
              }`}
            >
              {endpoint.ready ? <Check className="size-2.5" /> : <Cross className="size-2" />}
            </span>
            <span className="w-[34px] shrink-0 font-mono text-[11.5px] text-ink-3">
              {endpoint.method}
            </span>
            <span
              className={`min-w-0 flex-1 truncate font-mono text-[11.5px] ${
                endpoint.ready ? 'text-ink-2' : 'text-ink-3'
              }`}
              title={endpoint.path}
            >
              {endpoint.path}
            </span>
            <span className="shrink-0 text-[11.5px] text-ink-3">{endpoint.note}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
        带「需登录」的接口走 Bearer JWT，未登录返回 401 E503。写链路接口后端尚未实现，前端只做占位。
      </p>

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between border-t border-line/70 pt-3 font-mono text-[11.5px] tracking-wide text-ink-3">
          <span className="truncate" title={apiBaseLabel}>
            {apiBaseLabel}
          </span>
          <span>V1a</span>
        </div>
      </div>
    </aside>
  );
}
