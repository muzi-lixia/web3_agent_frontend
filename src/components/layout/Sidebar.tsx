import { NavLink } from 'react-router-dom';
import { MessageOutlined, BookOutlined, CloudUploadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { MonoCopy, SectionTitle, StatusDot } from '@/components/ui/atoms';
import { chainMeta, truncateMiddle } from '@/lib/format';
import { useAppStore } from '@/store/app-store';

export function Sidebar({ onOpenWallet, onNavigate }: { onOpenWallet: () => void; onNavigate?: () => void }) {
  const wallet = useAppStore((state) => state.wallet);

  return (
    <aside className="flex h-full w-[268px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="mx-3 mt-3 rounded-xl border border-line bg-panel/55 p-3">
        <SectionTitle
          extra={
            <button
              type="button"
              onClick={onOpenWallet}
              className="text-[11.5px] text-ink-3 transition hover:text-mint"
            >
              {wallet ? '切换' : '设置'}
            </button>
          }
        >
          当前钱包
        </SectionTitle>

        {wallet ? (
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-mint/20 bg-mint/[0.07] font-mono text-[11.5px] text-mint">
              0x
            </span>
            <div className="min-w-0 flex-1">
              <MonoCopy value={wallet.address} display={truncateMiddle(wallet.address, 8, 6)} />
              <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
                <StatusDot tone="ok" />
                {chainMeta(wallet.chainId).name}
                <span className="font-mono">{wallet.chainId}</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenWallet}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong py-2 text-[13px] text-ink-3 transition hover:border-mint/30 hover:text-ink-2"
          >
            连接钱包
          </button>
        )}
      </div>

      <nav aria-label="主导航" className="mt-4 space-y-1 px-3">
        <SectionTitle className="mb-2">工作空间</SectionTitle>
        {[
          { to: '/', label: '智能对话', icon: <MessageOutlined /> },
          { to: '/knowledge/bases', label: '知识库管理', icon: <BookOutlined /> },
          { to: '/knowledge', label: '文档知识库', icon: <BookOutlined /> },
          { to: '/knowledge/upload', label: '上传文档', icon: <CloudUploadOutlined /> },
          { to: '/knowledge/jobs', label: '处理任务', icon: <UnorderedListOutlined /> },
        ].map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />
    </aside>
  );
}
