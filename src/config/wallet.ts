import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import type { AppKitNetwork } from '@reown/appkit/networks';
import { arbitrum, base, berachain, bsc, mainnet, polygon } from '@reown/appkit/networks';
import { createAppKit } from '@reown/appkit/react';
import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';

/**
 * 钱包连接配置（Reown AppKit + wagmi），与参照工程 web3-ai-copilot 同一套方案。
 *
 * 选 AppKit 而不是自己包一层 WalletConnect provider：
 * 钱包选择、扫码、账户切换/断连/复制地址都由它的弹窗负责，
 * 我们这边只剩「打开弹窗」和「签 SIWE 消息」两件事。
 */
const projectId: string = (import.meta.env.VITE_REOWN_PROJECT_ID ?? '').trim();

/** 没有 projectId 时 AppKit 连初始化都会失败，界面降级为浏览器插件钱包。 */
export const hasProjectId = projectId.length > 0;

export const networks = [mainnet, bsc, polygon, arbitrum, base, berachain] as [
  AppKitNetwork,
  ...AppKitNetwork[],
];

function createFallbackConfig() {
  return createConfig({
    chains: [mainnet],
    connectors: [injected()],
    transports: { [mainnet.id]: http() },
  });
}

export const wagmiConfig = (() => {
  if (!hasProjectId) return createFallbackConfig();

  const adapter = new WagmiAdapter({ projectId, networks });

  createAppKit({
    adapters: [adapter],
    networks,
    projectId,
    metadata: {
      name: '链上智能助手',
      description: 'Web3 链上智能 Agent 控制台',
      url: window.location.origin,
      icons: [],
    },
    themeMode: 'dark',
    themeVariables: { '--w3m-accent': '#3FD68C' },
    features: {
      analytics: false,
      // 只做钱包登录：邮箱/社交账号与「地址即身份」这条链路无关
      email: false,
      socials: false,
    },
  });

  return adapter.wagmiConfig;
})();
