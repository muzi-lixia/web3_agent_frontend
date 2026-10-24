import { ArrowDownLeft, ArrowUpRight, Warning } from '@/components/ui/marks';
import { chainMeta, explorerTxUrl, formatRawAmount, formatRelative, truncateMiddle } from '@/lib/format';
import { Chip } from '@/components/ui/atoms';
import type { TxRecord } from '@/types';

const STATUS_MAP = {
  success: { label: '成功', tone: 'ok' as const },
  failed: { label: '失败', tone: 'danger' as const },
  pending: { label: '待确认', tone: 'warn' as const },
};

const TYPE_LABEL = {
  native: '原生币',
  erc20: 'ERC20',
  internal: '内部交易',
};

function TxRow({ record }: { record: TxRecord }) {
  const chain = chainMeta(record.chainId);
  const status = STATUS_MAP[record.status];
  const isIn = record.direction === 'in';
  const counterparty = truncateMiddle(isIn ? record.from : record.to);
  const href = explorerTxUrl(record.chainId, record.hash);
  const DirectionIcon = record.status === 'failed' ? Warning : isIn ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <span
        className={`mt-[2px] grid size-7 shrink-0 place-items-center rounded-lg border ${
          record.status === 'failed'
            ? 'border-danger/25 bg-danger/[0.08] text-danger'
            : isIn
              ? 'border-ok/25 bg-ok/[0.08] text-ok'
              : 'border-line-strong bg-white/[0.03] text-ink-2'
        }`}
      >
        <DirectionIcon className="size-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11.5px] font-medium text-ink">
            {isIn ? '转入' : '转出'} {record.symbol}
          </span>
          <span className="font-mono text-[10px] text-ink-3">{TYPE_LABEL[record.type]}</span>
          <span className="text-[10px] text-ink-3">· {chain.short}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <span>{isIn ? '来自' : '发送至'}</span>
          <span className="font-mono text-ink-2">{counterparty}</span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div
          className={`font-mono text-[11.5px] tabular ${
            record.status === 'failed' ? 'text-ink-3 line-through' : 'text-ink'
          }`}
        >
          {isIn ? '+' : '−'}
          {formatRawAmount(record.amountRaw, record.decimals, 4)} {record.symbol}
        </div>
        <div className="mt-1 flex items-center justify-end gap-1.5">
          <span className="text-[10px] text-ink-3">{formatRelative(record.blockTime)}</span>
          <Chip tone={status.tone} className="h-[20px] px-1.5 text-[10px]">
            {status.label}
          </Chip>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-[10px] text-ink-3 underline decoration-line-strong underline-offset-2 transition hover:text-mint"
              title={record.hash}
            >
              tx
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function TxRecordList({ records }: { records: TxRecord[] }) {
  return (
    <section className="mt-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11.5px] font-medium tracking-[0.14em] text-ink-3 uppercase">
          交易记录
        </span>
        <Chip tone="neutral">{records.length} 笔</Chip>
        <span className="ml-auto text-[10px] text-ink-3">合并普通 / ERC20 / 内部交易并去重</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-panel/60 divide-y divide-line/60">
        {records.map((record) => (
          <TxRow key={`${record.chainId}-${record.hash}`} record={record} />
        ))}
      </div>
    </section>
  );
}
