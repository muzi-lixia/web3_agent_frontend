import { Drawer } from 'antd';
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Inspector } from '@/components/layout/Inspector';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { WalletDialog } from '@/components/wallet/WalletDialog';
import { useHistorySync } from '@/hooks/use-history';
import { useAppStore } from '@/store/app-store';

export function AppShell() {
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const walletOpen = useAppStore((state) => state.walletOpen);
  const openWallet = useAppStore((state) => state.openWallet);
  const closeWallet = useAppStore((state) => state.closeWallet);

  // 登录后把服务端对话铺回当前会话
  useHistorySync();

  return (
    <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-void">
      <TopBar onOpenNav={() => setNavOpen(true)} onOpenWallet={openWallet} />

      <div className="relative flex min-h-0 flex-1">
        <div className="hidden lg:block">
          <Sidebar onOpenWallet={openWallet} />
        </div>

        <main className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </main>

        {pathname === '/' && <Inspector />}
      </div>

      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        placement="left"
        width={268}
        closable={false}
        rootClassName="lg:hidden"
        styles={{
          body: { padding: 0, background: '#0a0d12' },
          content: { padding: 0, background: '#0a0d12' },
          header: { display: 'none' },
        }}
      >
        <Sidebar
          onNavigate={() => setNavOpen(false)}
          onOpenWallet={() => {
            setNavOpen(false);
            openWallet();
          }}
        />
      </Drawer>

      <WalletDialog open={walletOpen} onClose={closeWallet} />
    </div>
  );
}
