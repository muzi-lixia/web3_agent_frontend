import '@ant-design/v5-patch-for-react-19';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';

// 必须早于 App：这个模块在导入时就完成 AppKit 初始化，晚于任何 useAppKit() 都会拿到未初始化实例
import { wagmiConfig } from './config/wallet';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 0,
    },
    mutations: {
      retry: 0,
    },
  },
});

const fontFamily = "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        // 与参照工程 web3-ai-copilot 的 ConfigProvider 逐字段一致
        token: {
          colorPrimary: '#3fd68c',
          colorBgBase: '#0a0d12',
          colorBgContainer: '#11151c',
          colorText: '#ffffff',
          colorTextSecondary: '#e8eef5',
          colorBorder: '#2e3846',
          borderRadius: 10,
          fontFamily,
        },
      }}
    >
      <AntApp>
        {/* WagmiProvider 在外层：wagmi 内部复用同一个 QueryClient */}
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </WagmiProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
