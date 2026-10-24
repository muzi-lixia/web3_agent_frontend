# 链上智能 Agent 助手 · 前端控制台

对齐 `PRD V1.5` / `单 Agent 架构 v0.8` / `聊天接口完整调用序列 v2`。当前交付范围为 **V1a 只读链路**。

## 运行

```bash
cp .env.example .env
npm install
npm run dev          # http://127.0.0.1:5173
```

后端按 `web3_agent_backend/README.md` 启动在 `127.0.0.1:8000`。开发期由 Vite 代理 `/api` 与 `/health`，
浏览器侧保持同源，**不依赖后端 CORS**。

没有后端时，打开右上角 **Mock** 开关即可走查完整界面（假数据不发起网络请求）。

## 技术栈

| 层 | 选型 |
|---|---|
| 构建 | Vite 7 + TypeScript strict |
| UI | React 19 + antd 5（`@ant-design/v5-patch-for-react-19`） |
| 样式 | Tailwind 4（**关闭 preflight**，避免覆盖 antd 组件；主题统一走 ConfigProvider token） |
| 数据 | TanStack Query（请求 / 健康检查轮询） |
| 钱包 | Reown AppKit（WalletConnect 弹窗）+ wagmi + viem |
| 状态 | Zustand + localStorage（对话记录、钱包、Mock 开关） |
| 路由 | React Router 7（单页 `/`） |

## 目录

```
src/
  components/
    layout/     TopBar / Sidebar / Inspector / DataPrivacy / AppShell
    chat/       MessageList / MessageItem / Composer / ToolTrace / ErrorNotice / EmptyState
    cards/      资产卡 / 交易记录 / 质押仓位 / 意图回显（写链路占位）
    wallet/     钱包登录卡（连接 / 签名 / 会话），钱包弹窗由 AppKit 提供
    ui/         原子样式：Chip / StatusDot / MonoCopy / 自绘图标
  hooks/        useChat（发送与错误落位）/ useHistorySync（首屏回填 + 翻页）/ useWalletAuth / useBackendHealth
  lib/          api（含 CORS 与错误映射）/ mock / format（BigInt 金额换算）
  store/        Zustand 持久化状态
  types/        PRD 6/7 章契约
```

## 与后端的契约现状

已对接：`POST /auth/nonce`、`POST /auth/verify`、`POST /chat`、`GET /chat/history`、
`POST /chat/clear`、`DELETE /chat/memory`、`GET /health`、`GET /health/ready`。

- `/chat`、`/chat/history`、`/chat/clear`、`/chat/memory` 都要求 `Authorization: Bearer <JWT>`，
  未登录后端返回 401 `E503`。前端未登录时不会先往界面写消息，而是直接拉起登录卡。
- `/chat/history` 按 `before=<最早一条 id>` 往前翻页，一页 50 条；首屏判 `hasMore`，
  界面顶部出现「加载更早的记录」，翻页时补偿滚动位置，视线不跳。
- `history` 的每条记录带 `toolCalls`，回放时一并复原工具轨迹 —— 否则刷新后工具卡片会凭空消失。
- `/chat/clear` 删消息 + 摘要，保留长期记忆；`DELETE /chat/memory` 是合规删除，
  连用户档案与长期记忆一起删，不可恢复。两者入口分开：顶部清空按钮 / 右栏「数据与隐私」。
- JWT 绑定签名时的 `chainId`；请求体的 `wallet.chainId` 必须与之一致，否则 403 `E509`。
  钱包中途换链会清掉本地登录态，要求重新签名。
- 服务端对话按 `siwe_user_id` 存成一条线性记录，没有会话 id 概念，**前端也只有一个对话**：
  登录后用 `/chat/history` 整段覆盖本地记录；`/chat/clear` 清空的是该地址的全部服务端记忆（消息 + 摘要）。
  旧版本的多会话持久化数据会在读取时迁移成单会话，不会因为升级丢历史。
- 后端 `data` 目前只返回 `steps` 与 `toolCalls`；`assets` / `transactions` / `stakePosition`
  是前端按 PRD 6.2 预留的结构位，后端补齐后即可直接渲染卡片，无需改组件。
- `intent/confirm`、`workflow/{taskId}`、`tx/report` 后端尚未实现，
  Inspector 面板里逐条标注为未就绪，界面不伪造成功状态。
- 金额一律 `raw` 十进制字符串 → BigInt 换算，全程不经过浮点（PRD 6.5）。
- 错误文案直接采用后端 `errorMsg`，前端不做二次生成（PRD 11）。
