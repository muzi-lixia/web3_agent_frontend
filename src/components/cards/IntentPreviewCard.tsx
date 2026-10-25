import { Button, Popconfirm } from 'antd';

import { Chip, MonoCopy } from '@/components/ui/atoms';
import { ArrowUpRight, Check, Cross, Shield, Warning } from '@/components/ui/marks';
import { useTransferTask, type TxPhase } from '@/hooks/use-transfer-task';
import {
  actionLabel,
  chainMeta,
  explorerTxUrl,
  formatClock,
  isValidAddress,
  opLabel,
  shortHash,
} from '@/lib/format';
import type { IntentPreview } from '@/types';

type Tone = 'neutral' | 'mint' | 'warn' | 'danger' | 'ok';

const HEADER: Record<TxPhase, { label: string; tone: Tone }> = {
  confirm: { label: '待确认', tone: 'warn' },
  confirming: { label: '提交中', tone: 'warn' },
  sign: { label: '待签名', tone: 'warn' },
  signing: { label: '等待钱包', tone: 'warn' },
  reporting: { label: '上报中', tone: 'warn' },
  submitted: { label: '已广播', tone: 'mint' },
  settled: { label: '已完成', tone: 'ok' },
  failed: { label: '链上失败', tone: 'danger' },
  aborted: { label: '已拒绝', tone: 'neutral' },
  expired: { label: '已过期', tone: 'neutral' },
};

/**
 * 转账意图卡片：回显 → 确认 → 钱包签名广播 → 等回执。
 *
 * 卡片本身不签名也不持有私钥，只把后端给的待签名参数交给钱包；
 * 每一步的状态都来自服务端，刷新后凭 taskId 重新取回来。
 */
export function IntentPreviewCard({
  preview,
  riskTags = [],
  taskId,
}: {
  preview: IntentPreview;
  riskTags?: string[];
  taskId?: string | null;
}) {
  const { phase, hydrated, txIntent, txHash, chainId, expiresAt, error, confirm, send } =
    useTransferTask(taskId ?? null);

  const head = HEADER[phase];
  const isAddress = isValidAddress(preview.target);
  const explorer = txHash && chainId ? explorerTxUrl(chainId, txHash) : null;
  const accent = phase === 'settled' ? 'ok' : phase === 'failed' ? 'danger' : 'warn';

  return (
    <section
      className={`mt-3.5 overflow-hidden rounded-xl border ${
        accent === 'ok'
          ? 'border-ok/30 bg-ok/[0.035]'
          : accent === 'danger'
            ? 'border-danger/30 bg-danger/[0.035]'
            : 'border-warn/25 bg-warn/[0.035]'
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b px-3.5 py-2 ${
          accent === 'ok'
            ? 'border-ok/20'
            : accent === 'danger'
              ? 'border-danger/20'
              : 'border-warn/15'
        }`}
      >
        <span className="text-[11.5px] font-medium tracking-[0.14em] text-ink-2 uppercase">
          转账意图
        </span>
        <Chip tone={head.tone} className="h-[20px]">
          {head.label}
        </Chip>
        {phase === 'sign' && expiresAt && (
          <span className="font-mono text-[10px] text-ink-3">
            有效至 {formatClock(expiresAt * 1000)}
          </span>
        )}
        {taskId && (
          <span className="ml-auto font-mono text-[10px] text-ink-3">
            {taskId.slice(0, 8)}
          </span>
        )}
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
        {preview.fromAddress && (
          <div className="min-w-0 bg-panel/70 px-3.5 py-2.5">
            <div className="text-[10px] text-ink-3">付款方</div>
            <div className="mt-1 min-w-0 text-[13px]">
              <MonoCopy value={preview.fromAddress} display={shortHash(preview.fromAddress)} />
            </div>
          </div>
        )}
        {(txIntent || txHash || preview.chainId) && (preview.chainId ?? chainId) && (
          <div className="bg-panel/70 px-3.5 py-2.5">
            <div className="text-[10px] text-ink-3">网络</div>
            <div className="mt-1 text-[13px] text-ink">
              {chainMeta(preview.chainId ?? (chainId as number)).name}
            </div>
          </div>
        )}
        {txHash && (
          <div className="min-w-0 bg-panel/70 px-3.5 py-2.5">
            <div className="text-[10px] text-ink-3">交易哈希</div>
            <div className="mt-1 min-w-0 text-[13px]">
              <MonoCopy value={txHash} display={shortHash(txHash)} />
            </div>
          </div>
        )}
      </div>

      {preview.evidence && preview.evidence.length > 0 && (
        <div className="border-t border-line/60 px-3.5 py-2.5">
          <div className="text-[10px] text-ink-3">判断依据</div>
          <ul className="mt-1 space-y-1">
            {preview.evidence.map((item, index) => (
              <li key={index} className="font-mono text-[12px] text-ink">
                持有 {item.actual} {item.symbol}，{opLabel(item.op)} {item.right} {item.symbol}
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {error && (
        <div className="flex items-start gap-2 border-t border-danger/15 bg-danger/[0.05] px-3.5 py-2">
          <Warning className="mt-[2px] size-3 shrink-0 text-danger" />
          <span className="text-[11.5px] leading-relaxed text-danger/90">{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line/60 px-3.5 py-2.5">
        {phase === 'confirm' && (
          <>
            <Button
              size="small"
              type="primary"
              loading={!hydrated}
              disabled={!taskId}
              onClick={() => void confirm(true)}
            >
              确认并生成交易
            </Button>
            <Popconfirm
              title="拒绝后这笔转账不会再执行"
              okText="拒绝"
              cancelText="返回"
              onConfirm={() => void confirm(false)}
            >
              <Button size="small" disabled={!taskId || !hydrated}>
                拒绝执行
              </Button>
            </Popconfirm>
          </>
        )}

        {phase === 'confirming' && (
          <Button size="small" loading>
            提交中…
          </Button>
        )}

        {phase === 'sign' && (
          <Button size="small" type="primary" onClick={() => void send()}>
            在钱包中签名并发送
          </Button>
        )}

        {phase === 'signing' && (
          <Button size="small" loading>
            请在钱包中确认
          </Button>
        )}

        {phase === 'reporting' && (
          <Button size="small" loading>
            正在登记交易…
          </Button>
        )}

        {phase === 'submitted' && (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-mint">
            <span className="size-[6px] animate-pulse rounded-full bg-mint" />
            已广播，正在等待链上回执
          </span>
        )}

        {phase === 'settled' && (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ok">
            <Check className="size-3.5" />
            交易已上链
          </span>
        )}

        {phase === 'failed' && (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-danger">
            <Cross className="size-3.5" />
            交易在链上失败，资产未转出
          </span>
        )}

        {phase === 'aborted' && (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-2">
            <Cross className="size-3.5" />
            已拒绝，未发起任何链上操作
          </span>
        )}

        {phase === 'expired' && (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-2">
            <Warning className="size-3.5" />
            已超过有效期，需要重新发起
          </span>
        )}

        {explorer && (
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11.5px] text-ink-2 transition hover:text-mint"
          >
            在区块浏览器查看
            <ArrowUpRight className="size-3" />
          </a>
        )}

        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-ink-3">
          <Shield className="size-3" />
          签名与广播只在钱包侧，服务端不持有私钥
        </span>
      </div>
    </section>
  );
}
