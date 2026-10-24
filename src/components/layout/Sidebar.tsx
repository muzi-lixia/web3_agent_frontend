import { NavLink } from 'react-router-dom';
import { MessageOutlined, BookOutlined, CloudUploadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { MonoCopy, SectionTitle, StatusDot } from '@/components/ui/atoms';
import { Shield } from '@/components/ui/marks';
import { chainMeta, formatRelative, truncateMiddle } from '@/lib/format';
import { conversationTitle, useAppStore } from '@/store/app-store';

export function Sidebar({ onOpenWallet, onNavigate }: { onOpenWallet: () => void; onNavigate?: () => void }) {
  const messages = useAppStore((state) => state.messages);
  const wallet = useAppStore((state) => state.wallet);
  const auth = useAppStore((state) => state.auth);

  const lastAt = messages.length > 0 ? messages[messages.length - 1].createdAt : null;
  const synced = Boolean(auth && auth.expiresAt > Date.now());

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

      <div className="mt-5 flex items-center justify-between px-3">
        <SectionTitle>对话</SectionTitle>
        <span className="font-mono text-[11.5px] text-ink-3">
          {messages.length.toString().padStart(2, '0')} msg
        </span>
      </div>

      <div className="mt-1.5 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <NavLink to="/" onClick={onNavigate} className="nav-item is-active flex-col items-stretch gap-1">
          <span className="truncate">{conversationTitle(messages)}</span>
          <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-ink-3">
            <StatusDot tone={synced ? 'ok' : 'warn'} />
            {synced ? '已登录 · 服务端单会话' : '未登录 · 仅本地'}
            {lastAt && <span className="ml-auto">{formatRelative(lastAt)}</span>}
          </span>
        </NavLink>
      </div>

      <div className="space-y-2 border-t border-line/80 px-3 py-3">
        <div className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-3">
          <Shield className="mt-[1px] size-3 shrink-0 text-ok/80" />
          后端不持有私钥，只输出未签名交易意图
        </div>
        <div className="flex items-center justify-between font-mono text-[11.5px] tracking-wide text-ink-3">
          <span>V1a · READ ONLY</span>
          <span>PRD 1.5</span>
        </div>
      </div>
    </aside>
  );
}
