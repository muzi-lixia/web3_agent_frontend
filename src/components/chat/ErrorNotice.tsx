import { App as AntApp, Button, Tooltip } from 'antd';

import { Chip } from '@/components/ui/atoms';
import { Warning } from '@/components/ui/marks';
import type { MessageError } from '@/store/app-store';

export function ErrorNotice({
  error,
  onRetry,
}: {
  error: MessageError;
  onRetry?: () => void;
}) {
  const { message: toast } = AntApp.useApp();

  const copyTrace = async () => {
    if (!error.traceId) return;
    try {
      await navigator.clipboard.writeText(error.traceId);
      toast.success('已复制 Trace ID');
    } catch {
      toast.error('复制失败，请手动选择');
    }
  };

  return (
    <div className="mt-1 overflow-hidden rounded-xl border border-danger/25 bg-danger/[0.045]">
      <div className="flex items-start gap-2.5 px-3.5 py-3">
        <Warning className="mt-[3px] size-4 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone="danger" mono className="h-[20px] text-[10px]">
              {error.code}
            </Chip>
            <span className="font-mono text-[10px] text-ink-3">
              HTTP {error.status || '—'}
            </span>
            {error.retryable && (
              <Chip tone="warn" className="h-[20px] text-[10px]">
                可重试
              </Chip>
            )}
          </div>

          <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{error.message}</p>

          <div className="mt-2.5 flex items-center gap-3">
            {onRetry && (
              <Button size="small" onClick={onRetry}>
                重新发送
              </Button>
            )}
            <Tooltip title="申诉受理流程在 P2 开放，此处仅占位（PRD 13.8）">
              <button
                type="button"
                className="text-[11.5px] text-ink-3 underline decoration-line-strong underline-offset-2 transition hover:text-ink-2"
              >
                申诉入口
              </button>
            </Tooltip>
            {error.traceId ? (
              <Tooltip title="点击复制，报障时把它给后端即可定位这次请求">
                <button
                  type="button"
                  onClick={() => void copyTrace()}
                  className="max-w-[180px] truncate font-mono text-[10px] text-ink-3 transition hover:text-ink-2"
                >
                  trace {error.traceId}
                </button>
              </Tooltip>
            ) : (
              <span className="text-[10px] text-ink-3">错误文案由后端模板固定</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
