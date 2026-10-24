import { ArrowUpRight, Warning as WarningAmber } from '@/components/ui/marks';
import { chainMeta, explorerAddressUrl, formatRawAmount } from '@/lib/format';
import { Chip, StatusDot } from '@/components/ui/atoms';
import type { ChainAssetGroup, TokenAsset, WalletRef } from '@/types';

const SYMBOL_TONE: Record<string, string> = {
  ETH: 'text-mint border-mint/25 bg-mint/[0.08]',
  BNB: 'text-warn border-warn/25 bg-warn/[0.08]',
  POL: 'text-mint-soft border-mint-soft/25 bg-mint-soft/[0.08]',
  MATIC: 'text-mint-soft border-mint-soft/25 bg-mint-soft/[0.08]',
  USDC: 'text-sky-300 border-sky-400/25 bg-sky-400/[0.08]',
  USDT: 'text-ok border-ok/25 bg-ok/[0.08]',
  LINK: 'text-indigo-300 border-indigo-400/25 bg-indigo-400/[0.08]',
};

function TokenRow({ asset }: { asset: TokenAsset }) {
  const tone = SYMBOL_TONE[asset.symbol] ?? 'text-ink-2 border-line-strong bg-white/[0.03]';
  return (
    <div className="flex items-center gap-3 px-3 py-[9px]">
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-lg border font-mono text-[10px] tracking-tight ${tone}`}
      >
        {asset.symbol.slice(0, 3)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-ink">{asset.symbol}</span>
          {asset.isNative && <span className="text-[10px] text-ink-3">原生币</span>}
        </div>
        <div className="truncate text-[11.5px] text-ink-3">{asset.name ?? '—'}</div>
      </div>
      <div className="min-w-0 text-right">
        <div className="font-mono text-[13px] tabular text-ink">
          {formatRawAmount(asset.balanceRaw, asset.decimals, 4)}
        </div>
        <div
          className="truncate font-mono text-[10px] text-ink-3"
          title={`${asset.balanceRaw}（最小单位，decimals ${asset.decimals}）`}
        >
          {asset.balanceRaw}
        </div>
      </div>
    </div>
  );
}

function ChainGroup({ group }: { group: ChainAssetGroup }) {
  const chain = chainMeta(group.chainId);
  const hasError = Boolean(group.error);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel/60">
      <div className="flex items-center gap-2 border-b border-line/80 bg-white/[0.015] px-3 py-2">
        <StatusDot tone={hasError ? 'warn' : 'ok'} />
        <span className="text-[11.5px] font-medium text-ink">{chain.name}</span>
        <span className="font-mono text-[10px] text-ink-3">chainId {group.chainId}</span>
        <span className="ml-auto text-[10px] text-ink-3">
          {hasError ? '该链查询失败' : `${group.items.length} 个代币`}
        </span>
      </div>

      {hasError ? (
        <div className="flex items-start gap-2 px-3 py-2.5">
          <WarningAmber className="mt-[3px] size-3.5 shrink-0 text-warn" />
          <p className="text-[11.5px] leading-relaxed text-ink-2">{group.error}</p>
        </div>
      ) : group.items.length === 0 ? (
        <div className="px-3 py-3 text-[11.5px] text-ink-3">该链上暂无代币余额</div>
      ) : (
        <div className="divide-y divide-line/60">
          {group.items.map((asset) => (
            <TokenRow key={`${asset.chainId}-${asset.symbol}-${asset.tokenAddress ?? 'native'}`} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AssetBalanceCards({
  groups,
  wallet,
}: {
  groups: ChainAssetGroup[];
  wallet: WalletRef | null;
}) {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const failed = groups.filter((group) => group.error).length;

  return (
    <section className="mt-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11.5px] font-medium tracking-[0.14em] text-ink-3 uppercase">
          资产总览
        </span>
        <Chip tone="neutral">{total} 个代币</Chip>
        <Chip tone={failed > 0 ? 'warn' : 'neutral'}>{groups.length} 条链</Chip>
        {wallet && explorerAddressUrl(wallet.chainId, wallet.address) && (
          <a
            href={explorerAddressUrl(wallet.chainId, wallet.address) ?? '#'}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-ink-3 transition hover:text-mint"
          >
            区块浏览器
            <ArrowUpRight className="size-3" />
          </a>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {groups.map((group) => (
          <ChainGroup key={group.chainId} group={group} />
        ))}
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-ink-3">
        只读查询按白名单链遍历，每链取 topN=20；单链失败只标记该链，其余结果照常返回。
      </p>
    </section>
  );
}
