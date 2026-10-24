import { App as AntApp, Switch } from 'antd';
import { MenuOutlined } from '@ant-design/icons';

import { Brand, Chip, StatusDot } from '@/components/ui/atoms';
import { WalletIcon } from '@/components/ui/marks';
import { chainMeta } from '@/lib/format';
import { useBackendHealth } from '@/hooks/use-health';
import { useAppStore } from '@/store/app-store';

export function TopBar({
  onOpenNav,
  onOpenWallet,
}: {
  onOpenNav: () => void;
  onOpenWallet: () => void;
}) {
  const { status } = useBackendHealth();
  const mockMode = useAppStore((state) => state.mockMode);
  const setMockMode = useAppStore((state) => state.setMockMode);
  const wallet = useAppStore((state) => state.wallet);
  const auth = useAppStore((state) => state.auth);
  const { message } = AntApp.useApp();

  const online = status?.online ?? false;
  const statusLabel = mockMode ? 'Mock 数据' : online ? '后端已连接' : '后端未连接';
  const statusTone = mockMode ? 'idle' : online ? 'ok' : 'danger';

  return (
    <header className="relative z-20 flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-panel px-3 backdrop-blur-md sm:px-4">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="打开侧栏"
        className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-2 transition hover:bg-white/[0.04] hover:text-ink lg:hidden"
      >
        <MenuOutlined className="text-[13px]" />
      </button>

      <Brand />

      <span className="hidden h-5 w-px bg-line sm:block" />
      <Chip tone="mint" className="hidden sm:inline-flex">
        只读链路 V1a
      </Chip>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden h-8 items-center gap-2 rounded-lg border border-line bg-white/[0.02] px-2.5 md:flex">
          <StatusDot tone={statusTone} pulse={statusTone === 'ok'} />
          <span className="text-[13px] text-ink-2">{statusLabel}</span>
          {!mockMode && online && status && (
            <span className="font-mono text-[11.5px] text-ink-3">{status.latencyMs}ms</span>
          )}
        </div>

        <label
          className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white/[0.02] px-2.5"
          title="切换 Mock 数据，用于无后端时走查界面"
        >
          <span className="hidden text-[13px] text-ink-3 sm:block">Mock</span>
          <Switch
            size="small"
            checked={mockMode}
            onChange={(checked) => {
              setMockMode(checked);
              message.info(checked ? '已切换到 Mock 数据' : '已切换到真实后端');
            }}
          />
        </label>

        <button
          type="button"
          onClick={onOpenWallet}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-line-strong bg-panel-2 px-2.5 text-[13px] text-ink-2 transition hover:border-mint/30 hover:text-ink"
          title={auth ? `已登录 ${auth.address}` : wallet ? `${wallet.address}（未登录）` : '连接钱包'}
        >
          <WalletIcon className={auth ? 'size-3.5 text-mint' : 'size-3.5 text-ink-3'} />
          {wallet ? (
            <>
              <span className="font-mono">
                {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
              </span>
              {auth ? (
                <span className="hidden text-[11.5px] text-mint sm:block">已登录</span>
              ) : (
                <span className="hidden font-mono text-[11.5px] text-ink-3 sm:block">
                  {chainMeta(wallet.chainId).short}
                </span>
              )}
            </>
          ) : (
            <span>连接钱包</span>
          )}
        </button>
      </div>
    </header>
  );
}
