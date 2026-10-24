import { Chip, KeyValue, MonoCopy } from '@/components/ui/atoms';
import { chainMeta, explorerAddressUrl, formatRawAmount, formatUnixSeconds } from '@/lib/format';
import { ArrowUpRight } from '@/components/ui/marks';
import type { StakePositionView } from '@/types';

const CONTRACT_STATUS = {
  active: { label: '合约正常', tone: 'ok' as const },
  paused: { label: '合约已暂停', tone: 'warn' as const },
  deprecated: { label: '合约已废弃', tone: 'danger' as const },
};

export function StakePositionCard({ position }: { position: StakePositionView }) {
  const chain = chainMeta(position.chainId);
  const contractStatus = CONTRACT_STATUS[position.contractStatus];
  const href = position.contractAddress
    ? explorerAddressUrl(position.chainId, position.contractAddress)
    : null;

  return (
    <section className="mt-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11.5px] font-medium tracking-[0.14em] text-ink-3 uppercase">
          质押仓位
        </span>
        <Chip tone="neutral">{chain.short}</Chip>
        <Chip tone={contractStatus.tone}>{contractStatus.label}</Chip>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-panel/60">
        <div className="grid grid-cols-2 divide-x divide-line/70 border-b border-line/70">
          <div className="px-4 py-3.5">
            <div className="text-[10px] tracking-[0.12em] text-ink-3 uppercase">已质押</div>
            <div className="mt-1.5 truncate font-mono text-[19px] leading-none tabular text-ink">
              {formatRawAmount(position.stakedAmount, position.decimals, 4)}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-[11.5px] text-ink-2">{position.tokenSymbol}</span>
              <span className="truncate font-mono text-[10px] text-ink-3">
                raw {position.stakedAmount}
              </span>
            </div>
          </div>
          <div className="px-4 py-3.5">
            <div className="text-[10px] tracking-[0.12em] text-ink-3 uppercase">待领奖励</div>
            <div className="mt-1.5 truncate font-mono text-[19px] leading-none tabular text-mint">
              {formatRawAmount(position.pendingReward, position.decimals, 4)}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-[11.5px] text-ink-2">{position.tokenSymbol}</span>
              <span className="truncate font-mono text-[10px] text-ink-3">
                raw {position.pendingReward}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 py-2">
          {position.alias && <KeyValue label="质押池">{position.alias}</KeyValue>}
          {position.contractAddress && (
            <KeyValue label="合约地址">
              <span className="inline-flex items-center gap-1.5">
                <MonoCopy value={position.contractAddress} display={position.contractAddress} />
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-ink-3 transition hover:text-mint"
                    title="在区块浏览器查看合约"
                  >
                    <ArrowUpRight className="size-3" />
                  </a>
                )}
              </span>
            </KeyValue>
          )}
          <KeyValue label="仓位状态">
            <Chip tone={position.positionStatus === 'locked' ? 'warn' : 'ok'} className="h-[20px]">
              {position.positionStatus === 'locked' ? '锁定期内' : '可退出'}
            </Chip>
          </KeyValue>
          <KeyValue label="解锁时间">
            {position.unlockAt ? formatUnixSeconds(position.unlockAt) : '无锁定期'}
          </KeyValue>
          <KeyValue label="奖励模式">
            <span className="font-mono text-[11.5px]">{position.rewardMode}</span>
          </KeyValue>
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-ink-3">
        质押代币由 StakeAdapter 的 supportedTokens() 返回，不接受口头参数；数值为链上 raw
        最小单位，前端按 decimals={position.decimals} 换算。
      </p>
    </section>
  );
}
