import { useAppKit, useAppKitNetwork } from '@reown/appkit/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useDisconnect, useSignMessage } from 'wagmi';
import { networks } from '@/config/wallet';
import { useBackendHealth } from '@/hooks/use-health';
import { ApiError, api } from '@/lib/api';
import { useAppStore } from '@/store/app-store';

const NO_CHAINS: number[] = [];

/** 首帧只校验一次：未登录就断掉上次留下的钱包会话，多个组件共用同一份判断。 */
let bootAuthChecked = false;

/** 登录阶段：卡在哪一步，页面上就显示哪一句。 */
export type LoginStage = 'idle' | 'nonce' | 'signing' | 'verifying' | 'done';
export type AuthPhase = 'disconnected' | 'connected' | 'authenticated';

const STAGE_TEXT: Record<LoginStage, string> = {
  idle: '在钱包中签名',
  nonce: '正在获取签名消息…',
  signing: '请在钱包中确认签名',
  verifying: '正在验证签名…',
  done: '登录成功',
};

function describe(error: unknown): string {
  if (error instanceof ApiError) return `${error.code} · ${error.message}`;
  const message = error instanceof Error ? error.message : '操作失败，请重试';
  if (/user rejected|denied|4001/i.test(message)) return '你取消了签名';
  return message;
}

export function useWalletAuth() {
  const { open } = useAppKit();
  const { switchNetwork } = useAppKitNetwork();
  const { address, chainId, isConnected, status: accountStatus } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnectAsync } = useDisconnect();

  const auth = useAppStore((state) => state.auth);
  const setWallet = useAppStore((state) => state.setWallet);
  const setAuth = useAppStore((state) => state.setAuth);

  const { status } = useBackendHealth();
  const allowedChains = status?.health?.chains ?? NO_CHAINS;

  const [stage, setStage] = useState<LoginStage>('idle');
  const [signingMessage, setSigningMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'logout' | null>(null);

  // 钱包是唯一事实来源：连接、换号、断开都由 wagmi 推给我们，再同步到界面
  useEffect(() => {
    if (isConnected && address) {
      setWallet({ address, chainId: chainId ?? 1 }, 'walletconnect');
    } else {
      setWallet(null);
    }
  }, [address, chainId, isConnected, setWallet]);

  // 没登录就不留上次的钱包会话：刷进来时如果 JWT 已失效，断开连接，地址也不留在界面上。
  // 只在重连结束后的首帧判一次，否则刚点「连接钱包」会被自己断掉。
  useEffect(() => {
    if (bootAuthChecked) return;
    if (accountStatus === 'connecting' || accountStatus === 'reconnecting') return;
    bootAuthChecked = true;
    if (accountStatus !== 'connected') return;
    const stored = useAppStore.getState().auth;
    if (!stored || stored.expiresAt <= Date.now()) void disconnectAsync();
  }, [accountStatus, disconnectAsync]);

  // 过期的 JWT 不留在界面上，免得用户以为还登着
  useEffect(() => {
    if (auth && auth.expiresAt <= Date.now()) setAuth(null);
  }, [auth, setAuth]);

  // JWT 绑定签名时的链，换链后旧 token 一律过不了 E509，直接退回未登录。
  // wagmi 的换链是异步落地的，等一拍再判定，否则刚签完自己就把自己清掉。
  useEffect(() => {
    if (!auth || !chainId || auth.chainId === chainId) return;
    const timer = window.setTimeout(() => {
      const current = useAppStore.getState();
      if (current.auth && current.auth.chainId !== chainId) {
        current.setAuth(null);
        setError('网络已切换，请重新签名登录');
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [auth, chainId, setAuth]);

  const phase: AuthPhase = auth ? 'authenticated' : isConnected ? 'connected' : 'disconnected';
  const isSigning = stage !== 'idle' && stage !== 'done';

  const remainingMinutes = useMemo(() => {
    if (!auth) return 0;
    return Math.max(0, Math.round((auth.expiresAt - Date.now()) / 60_000));
  }, [auth]);

  /** 连接与签名分两次点击：未连接时只负责弹出 AppKit 的钱包弹窗。 */
  const login = useCallback(async () => {
    setError(null);
    setSigningMessage(null);

    if (!isConnected || !address) {
      await open();
      return;
    }

    try {
      // 后端只认白名单链；钱包停在别的网络时先切过去，再取 nonce（nonce 只有 5 分钟）
      let signChain = chainId ?? allowedChains[0] ?? 1;
      if (allowedChains.length > 0 && chainId && !allowedChains.includes(chainId)) {
        const target = networks.find((network) => Number(network.id) === allowedChains[0]);
        if (target) {
          await switchNetwork(target);
          signChain = allowedChains[0];
        }
      }

      setStage('nonce');
      const nonce = await api.authNonce(address, signChain);
      setSigningMessage(nonce.message);

      setStage('signing');
      const signature = await signMessageAsync({ account: address, message: nonce.message });

      setStage('verifying');
      const result = await api.authVerify(nonce.message, signature);

      // chainId 记签名时用的那条链：后端拿它跟请求体比对，记错就是必然 E509
      setAuth({
        token: result.token,
        address: result.siweAddress,
        shortAddress: result.siweAddressShort,
        chainId: signChain,
        expiresAt: Date.now() + result.expiresIn * 1000,
      });
      setStage('done');
    } catch (err) {
      setStage('idle');
      setError(describe(err));
    }
  }, [address, allowedChains, chainId, isConnected, open, setAuth, signMessageAsync, switchNetwork]);

  /** onlySession=true 只清 JWT，钱包连接保留；false 连 AppKit 会话一起断。 */
  const logout = useCallback(
    async (onlySession = true) => {
      setBusy('logout');
      try {
        setAuth(null);
        setStage('idle');
        setSigningMessage(null);
        if (!onlySession) await disconnectAsync();
      } finally {
        setBusy(null);
      }
    },
    [disconnectAsync, setAuth],
  );

  /** 换钱包/断开/复制地址都交给 AppKit 的账户弹窗。 */
  const openAccount = useCallback(async () => {
    await open({ view: 'Account' });
  }, [open]);

  return {
    phase,
    address: address ?? null,
    auth,
    stage,
    stageText: STAGE_TEXT[stage],
    isSigning,
    signingMessage,
    error,
    busy,
    remainingMinutes,
    allowedChains,
    login,
    logout,
    openAccount,
    clearError: () => setError(null),
  };
}
