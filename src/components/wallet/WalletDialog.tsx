import { Alert, Button, Modal } from 'antd';

import { Cross } from '@/components/ui/marks';
import { hasProjectId } from '@/config/wallet';
import { useWalletAuth } from '@/hooks/use-wallet-auth';

/** 未连接时展示的占位原文，与后端真正下发的 SIWE 消息同形制。 */
const PLACEHOLDER_MESSAGE = `连接钱包后，服务端将生成签名原文。
消息包含登录域名、地址、nonce 和有效期。
请核对钱包中的消息，不签署来源不明的请求。`;

const STEPS = ['请求 nonce', '钱包签名', '校验并签发凭证'] as const;

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="关闭" className="wallet-close">
      <Cross className="size-3.5" />
    </button>
  );
}

function LoginCard({ onClose }: { onClose: () => void }) {
  const {
    phase,
    address,
    auth,
    stage,
    stageText,
    isSigning,
    signingMessage,
    error,
    busy,
    remainingMinutes,
    login,
    logout,
    openAccount,
  } = useWalletAuth();

  const step = ['nonce', 'signing', 'verifying'].indexOf(stage);
  const authenticated = phase === 'authenticated';

  return (
    <div className="wallet-card">
      <CloseButton onClose={onClose} />

      <div className="wallet-head">
        <div className="wallet-logo">W3</div>
        <h2>连接钱包</h2>
        <p>用钱包签名证明地址归属，无需密码</p>
      </div>

      <div className="wallet-steps">
        {STEPS.map((label, index) => {
          const done = authenticated || index < step;
          const active = !authenticated && index === step;
          return (
            <div
              key={label}
              className={`wallet-step ${done ? 'done' : active ? 'active' : ''}`}
            >
              {index + 1} · {label}
              <span>{done ? '已完成' : active ? stageText : '等待执行'}</span>
            </div>
          );
        })}
      </div>

      <div className="wallet-siwe">
        <div className="wallet-siwe-h">
          待签名消息（SIWE / EIP-4361）
          <span className="wallet-tag">服务端生成</span>
        </div>
        <pre>{signingMessage ?? PLACEHOLDER_MESSAGE}</pre>
      </div>

      {phase !== 'disconnected' && address && <p className="wallet-addr">已连接 {address}</p>}

      {authenticated ? (
        <Button block danger loading={busy === 'logout'} onClick={() => void logout(true)}>
          退出当前会话
        </Button>
      ) : (
        <Button
          type="primary"
          block
          loading={isSigning}
          disabled={isSigning}
          onClick={() => void login()}
        >
          {isSigning ? stageText : phase === 'connected' ? '在钱包中签名' : '连接钱包'}
        </Button>
      )}

      <div className="wallet-foot">签名仅验证身份，不发起链上交易，也不消耗 Gas</div>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          description="本次登录未完成。确认钱包与网络后，可重新发起签名。"
          style={{ marginTop: 12 }}
        />
      )}

      {authenticated && auth && (
        <div className="wallet-links">
          <button type="button" onClick={() => void openAccount()}>
            打开钱包账户
          </button>
          <span>会话剩余 {remainingMinutes} 分钟</span>
        </div>
      )}

      {!authenticated && phase === 'connected' && (
        <div className="wallet-links">
          <button type="button" onClick={() => void openAccount()}>
            切换钱包 / 断开
          </button>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <div className="wallet-note">
          <strong>为什么安全</strong>
          <div>凭证只在服务器验证签名后签发，钱包地址由签名确认；前端不能声明另一个钱包的归属。</div>
        </div>

        <div className="wallet-note warn">
          <strong>切换钱包</strong>
          <div>
            切换钱包意味着切换身份，会清除旧登录与个人数据缓存。访问凭证自动续期，登录会话失效后需要重新签名。
          </div>
        </div>
      </div>
    </div>
  );
}

function MissingProjectId({ onClose }: { onClose: () => void }) {
  return (
    <div className="wallet-card">
      <CloseButton onClose={onClose} />
      <div className="wallet-head">
        <div className="wallet-logo">W3</div>
        <h2>连接钱包</h2>
        <p>用钱包签名证明地址归属，无需密码</p>
      </div>
      <div className="wallet-note warn">
        <strong>缺少 projectId</strong>
        <div>
          在 <span className="font-mono">.env</span> 里填{' '}
          <span className="font-mono">VITE_REOWN_PROJECT_ID</span>（
          <a
            href="https://cloud.reown.com"
            target="_blank"
            rel="noreferrer noopener"
            className="text-mint underline underline-offset-2"
          >
            cloud.reown.com
          </a>{' '}
          免费创建），重启开发服务后即可连接。
        </div>
      </div>
    </div>
  );
}

export function WalletDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      centered
      closable={false}
      destroyOnHidden
      rootClassName="wallet-modal"
    >
      {hasProjectId ? <LoginCard onClose={onClose} /> : <MissingProjectId onClose={onClose} />}
    </Modal>
  );
}
