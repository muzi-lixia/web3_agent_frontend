import { Alert, Button, Empty, Tag } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { useAppStore } from '@/store/app-store';
import { ApiError } from '@/lib/api';
import type { RagJob } from '@/types/rag';

export function useRagAccess() {
  const auth = useAppStore(s => s.auth);
  const mock = useAppStore(s => s.mockMode);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(id); }, []);
  return { token: auth?.token ?? '', identity: `${auth?.address ?? ''}:${auth?.expiresAt ?? ''}`,
    enabled: !!auth && auth.expiresAt > now && !mock, mock,
    loggedIn: !!auth && auth.expiresAt > now };
}

export function KnowledgeLayout({ title, description, actions, children }: {
  title: string; description: string; actions?: ReactNode; children: ReactNode;
}) {
  const access = useRagAccess();
  const openWallet = useAppStore(s => s.openWallet);
  return <div className="min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto max-w-[1280px] space-y-6 p-4 sm:p-7 lg:p-9">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="mb-2 font-mono text-[11px] tracking-[.2em] text-mint">KNOWLEDGE BASE</div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-ink-3">{description}</p></div>
        {access.enabled && actions}
      </header>
      {!access.loggedIn ? <div className="rounded-xl border border-line bg-panel p-10"><Empty description="请先连接钱包并签名登录，再访问知识库管理功能。"><Button type="primary" onClick={openWallet}>连接并登录</Button></Empty></div>
        : access.mock ? <Alert type="info" showIcon message="知识库管理使用真实后端" description="请关闭顶部 Mock 开关后上传和管理文档。" />
        : <>{children}</>}
    </div>
  </div>;
}

export function RequestError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  const detail = error instanceof ApiError ? error.status === 403
    ? '当前钱包没有知识库管理权限，请联系管理员将该地址加入管理白名单。'
    : error.status === 503 && error.code === 'E606' ? '后端尚未开启文档上传服务，请联系管理员完成配置。'
    : error.message : error instanceof Error ? error.message : '请求失败，请稍后重试。';
  return <Alert type="error" showIcon message="暂时无法完成操作" description={<div>{detail}{error instanceof ApiError && <div className="mt-1 font-mono text-xs">{error.code}{error.traceId && ` · ${error.traceId}`}</div>}</div>}
    action={onRetry && <Button size="small" onClick={onRetry}>重试</Button>} />;
}

export const stageLabels: Record<string, string> = {
  queued: '等待处理', loading: '加载文件', parsing: '解析文本', chunking: '文本切块', embedding: '向量化', indexing: '写入知识库', succeeded: '入库完成',
};
export const jobLabels = { queued: '排队中', processing: '处理中', succeeded: '已完成', failed: '处理失败' };
export function JobStatus({ job }: { job: RagJob }) {
  const colors = { queued: 'default', processing: 'processing', succeeded: 'success', failed: 'error' };
  return <Tag color={colors[job.status]}>{jobLabels[job.status]}</Tag>;
}
export function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '长期有效';
}
export function safeSource(value: string | undefined) {
  try { const url = new URL(value ?? ''); return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
export function Pager({ offset, more, loading, onChange }: { offset: number; more: boolean; loading: boolean; onChange: (n: number) => void }) {
  return <div className="flex items-center justify-end gap-3 text-xs text-ink-3"><span>第 {offset / 10 + 1} 页</span>
    <Button size="small" disabled={!offset || loading} onClick={() => onChange(offset - 10)}>上一页</Button>
    <Button size="small" disabled={!more || loading} onClick={() => onChange(offset + 10)}>下一页</Button></div>;
}
