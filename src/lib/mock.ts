import type { ChatPayload, ChatResult } from '@/lib/api';
import type { ChatResponse, ChainAssetGroup, HealthPayload, TxRecord } from '@/types';

export const DEMO_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
const DEMO_TARGET = '0xbbbbcccc11112222333344445555666677778888';

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const ASSETS: ChainAssetGroup[] = [
  {
    chainId: 1,
    items: [
      { chainId: 1, symbol: 'ETH', name: 'Ether', decimals: 18, balanceRaw: '1284100000000000000', isNative: true },
      { chainId: 1, symbol: 'USDC', name: 'USD Coin', decimals: 6, balanceRaw: '2350500000', tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
      { chainId: 1, symbol: 'LINK', name: 'Chainlink', decimals: 18, balanceRaw: '42080000000000000000', tokenAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA' },
    ],
  },
  {
    chainId: 56,
    items: [
      { chainId: 56, symbol: 'BNB', name: 'BNB', decimals: 18, balanceRaw: '3021400000000000000', isNative: true },
      { chainId: 56, symbol: 'USDT', name: 'Tether USD', decimals: 18, balanceRaw: '890000000000000000000', tokenAddress: '0x55d398326f99059fF775485246999027B3197955' },
    ],
  },
  {
    chainId: 137,
    items: [],
    error: 'E301 · 链上服务暂时不可用，请稍后重试',
  },
];

const TRANSACTIONS: TxRecord[] = [
  {
    chainId: 1,
    hash: '0x9f2c4a1be7d3560a8f41c2de90bb7f13ac2d8e6f540b71c39ade4b62f8150c4d',
    blockTime: Date.now() - 1000 * 60 * 42,
    from: DEMO_ADDRESS,
    to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    direction: 'out',
    amountRaw: '150000000000000000',
    decimals: 18,
    symbol: 'ETH',
    type: 'native',
    status: 'success',
  },
  {
    chainId: 1,
    hash: '0x1c7de9b3a4425f0e8d6a72c4b19ff30d5ae8c7b2460d91fa3ce7b52d68a04f19',
    blockTime: Date.now() - 1000 * 60 * 60 * 5,
    from: '0x28C6c06298d514Db089934071355E5743bf21d60',
    to: DEMO_ADDRESS,
    direction: 'in',
    amountRaw: '2350000000',
    decimals: 6,
    symbol: 'USDC',
    type: 'erc20',
    status: 'success',
  },
  {
    chainId: 56,
    hash: '0x54b1e0c8f7a2936d1b8e4c05fa7d392e6b1c8d047af25e93b60c1d8e4a7f2036',
    blockTime: Date.now() - 1000 * 60 * 60 * 26,
    from: DEMO_ADDRESS,
    to: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    direction: 'out',
    amountRaw: '500000000000000000',
    decimals: 18,
    symbol: 'BNB',
    type: 'native',
    status: 'success',
  },
  {
    chainId: 1,
    hash: '0xab3d71f2c8049e65b17d3a8c0f42e79d5c6b18a3d07f94e2c58a6b13d9207f4e',
    blockTime: Date.now() - 1000 * 60 * 60 * 72,
    from: DEMO_ADDRESS,
    to: '0x1111111254EEB25477B68fb85Ed929f73A960582',
    direction: 'out',
    amountRaw: '2100000000000000000',
    decimals: 18,
    symbol: 'ETH',
    type: 'native',
    status: 'failed',
  },
];

const toolCall = (name: string, args: Record<string, unknown>, latency: number) => ({
  name,
  args,
  ok: true,
  error: null,
  latency_ms: latency,
});

function balanceResponse(): ChatResponse {
  return {
    type: 'answer',
    content: [
      '已按白名单链路扫描完成，以下是该钱包当前资产：',
      '',
      '- **Ethereum**：1.2841 ETH、2,350.5 USDC、42.08 LINK',
      '- **BNB Chain**：3.0214 BNB、890 USDT',
      '- **Polygon**：查询失败（E301 链上服务暂时不可用），不影响其余链路结果',
      '',
      '> 多链只读查询按每链 topN 返回，单链失败只标记该链，不会整体失败。',
    ].join('\n'),
    data: {
      steps: 1,
      toolCalls: [toolCall('get_asset_balance', { address: DEMO_ADDRESS, topN: 20 }, 412)],
      assets: ASSETS,
      notices: ['Polygon 查询失败：E301 链上服务暂时不可用，请稍后重试'],
    },
  };
}

function transactionResponse(): ChatResponse {
  return {
    type: 'answer',
    content: [
      '最近 4 笔链上交易如下（按时间倒序，已合并普通与 ERC20 交易）：',
      '',
      '- 42 分钟前转出 0.15 ETH，成功',
      '- 5 小时前收到 2,350.5 USDC，成功',
      '- 26 小时前在 BNB Chain 转出 0.5 BNB，成功',
      '- 3 天前一笔 2.1 ETH 转账被合约拒绝，失败',
    ].join('\n'),
    data: {
      steps: 1,
      toolCalls: [toolCall('get_transaction_records', { address: DEMO_ADDRESS, limit: 10 }, 389)],
      transactions: TRANSACTIONS,
    },
  };
}

function stakeResponse(): ChatResponse {
  return {
    type: 'answer',
    content: [
      '该钱包在 **A 质押池** 的仓位如下：',
      '',
      '- 质押数量：12,000 USDC',
      '- 待领取奖励：1.85 USDC',
      '- 仓位状态：active（无锁定期）',
      '',
      '质押代币由质押适配器 `supportedTokens()` 返回，与你的口头表述无关；本池为单一代币池。',
    ].join('\n'),
    data: {
      steps: 1,
      toolCalls: [
        toolCall(
          'get_stake_info',
          { userAddress: DEMO_ADDRESS, stakeContractAliasOrAddress: 'A-Stake-Pool' },
          233,
        ),
      ],
      stakePosition: {
        chainId: 1,
        tokenSymbol: 'USDC',
        decimals: 6,
        stakedAmount: '12000000000',
        pendingReward: '1850000',
        unlockAt: null,
        positionStatus: 'active',
        contractStatus: 'active',
        rewardMode: 'accrued',
        alias: 'A-Stake-Pool',
        contractAddress: '0x5f2c8a1dE7b4930c6f81a2B4d09E3c7f5A6b8C10',
      },
    },
  };
}

function writeIntentResponse(isStake: boolean): ChatResponse {
  return {
    type: 'intent_confirm',
    content: isStake
      ? '已解析到质押意图，参数如下。当前版本（V1a）仅开放只读查询，写操作尚未接入，不会生成任何交易意图。'
      : '已解析到转账意图，参数如下。当前版本（V1a）仅开放只读查询，写操作尚未接入，不会生成任何交易意图。',
    data: {
      steps: 0,
      toolCalls: [],
      notices: ['写链路（状态机 / TxIntent / 签名）尚未接入，本次不会产生任何链上交易'],
    },
    intentPreview: isStake
      ? { action: 'stake', tokenSymbol: 'USDC', humanAmount: '10000', target: 'A-Stake-Pool' }
      : { action: 'transfer', tokenSymbol: 'ETH', humanAmount: '0.1', target: DEMO_TARGET },
    riskTags: isStake ? ['质押涉及授权与两步交易', '写链路未接入'] : ['目标为 EOA 地址', '写链路未接入'],
    taskId: null,
    txIntent: null,
  };
}

function boundaryResponse(): ChatResponse {
  return {
    type: 'answer',
    content: [
      '这个请求超出了当前能力边界。我目前只支持三类只读查询：',
      '',
      '1. 查询钱包原生币与 ERC20 余额（可跨白名单链）',
      '2. 查询历史交易记录',
      '3. 查询白名单质押合约的仓位与奖励',
      '',
      '买币、swap、合约审计、行情预测、批量自动交易都不在支持范围内。',
    ].join('\n'),
    data: { steps: 0, toolCalls: [] },
  };
}

function secretResponse(): ChatResponse {
  return {
    type: 'answer',
    content:
      '出于安全考虑，请不要在对话中粘贴私钥或助记词。本产品不会读取、不会传输、也不会存储任何私钥信息。如已泄露，请立即将资产转移到新钱包。',
    data: { steps: 0, toolCalls: [] },
  };
}

function genericResponse(message: string): ChatResponse {
  return {
    type: 'answer',
    content: [
      `收到：「${message.slice(0, 80)}」`,
      '',
      '当前是 **Mock 模式**，用于在没有后端的情况下走查界面。切换到真实模式后，这条消息会交给本地 Ollama 做意图识别。',
      '',
      '可以试试：查余额 / 查交易记录 / 查 A 质押池仓位 / 转 0.1 ETH 给 0xbbbb…。',
    ].join('\n'),
    data: { steps: 0, toolCalls: [] },
  };
}

export function mockHealth(): HealthPayload {
  return {
    status: 'ok',
    db: true,
    chains: [1, 56, 137],
    langsmith: false,
    model: 'qwen2.5:7b (mock)',
  };
}

export async function mockChat(
  payload: Pick<ChatPayload, 'userMessage' | 'wallet'>,
): Promise<ChatResult> {
  const started = performance.now();
  const message = payload.userMessage.trim();
  await delay(520 + Math.round(Math.random() * 620));

  const pick = (): ChatResponse => {
    if (/私钥|助记词|mnemonic|private\s*key|seed\s*phrase/i.test(message)) return secretResponse();
    if (/买|swap|兑换|审计|行情|预测|自动交易/i.test(message)) return boundaryResponse();
    if (/质押|stake/i.test(message)) {
      return /查|多少|仓位|收益|奖励|状态/.test(message) && !/质押\s*\d/.test(message)
        ? stakeResponse()
        : writeIntentResponse(true);
    }
    if (/转|发送|transfer|send/i.test(message) && !/记录/.test(message)) return writeIntentResponse(false);
    if (/交易|流水|记录|历史|transactions?/i.test(message)) return transactionResponse();
    if (/余额|资产|持有|balance|asset/i.test(message)) return balanceResponse();
    return genericResponse(message);
  };

  return { response: pick(), latencyMs: Math.round(performance.now() - started) };
}
