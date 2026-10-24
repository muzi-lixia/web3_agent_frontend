import { App as AntApp, Popconfirm, Tooltip } from 'antd';
import { ClearOutlined } from '@ant-design/icons';

import { Chip } from '@/components/ui/atoms';
import { cancelChat } from '@/lib/inflight';
import { useClearConversation } from '@/hooks/use-history';
import { conversationTitle, useAppStore, type UiMessage } from '@/store/app-store';

export function SessionHeader({ messages }: { messages: UiMessage[] }) {
  const clearConversation = useAppStore((state) => state.clearConversation);
  const mockMode = useAppStore((state) => state.mockMode);
  const auth = useAppStore((state) => state.auth);
  const { clearRemote, isClearing } = useClearConversation();
  const { message: toast } = AntApp.useApp();

  const loggedIn = Boolean(auth && auth.expiresAt > Date.now());

  const handleClear = async () => {
    cancelChat();
    clearConversation();
    if (!loggedIn) {
      toast.success('本地记录已清空');
      return;
    }
    try {
      const result = await clearRemote();
      const count = result?.clearedMessages ?? 0;
      toast.success(
        count > 0 ? `已清除服务端 ${count} 条消息` : '服务端没有可清除的消息',
      );
    } catch {
      toast.warning('本地已清空，但服务端没清掉，稍后可再试一次');
    }
  };

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line/60 px-4">
      <span className="truncate text-[11.5px] text-ink-2">{conversationTitle(messages)}</span>
      <Chip tone="neutral" className="h-[20px] px-1.5 font-mono text-[10px]">
        {messages.length} msg
      </Chip>
      {mockMode && (
        <Chip tone="mint" className="h-[20px] px-1.5 text-[10px]">
          MOCK
        </Chip>
      )}

      <div className="ml-auto flex items-center gap-1">
        <span className="hidden font-mono text-[10px] text-ink-3 sm:block">
          {loggedIn ? '服务端单会话' : '未登录'}
        </span>
        <Tooltip title="清空当前对话">
          <Popconfirm
            title="清空当前对话？"
            description={
              loggedIn
                ? '本地记录与该钱包在服务端的全部对话记忆（含摘要）都会删除，长期记忆保留。'
                : '只清除本地聊天记录，服务端没有可清的数据。'
            }
            okText="清空"
            cancelText="取消"
            okButtonProps={{ danger: true, size: 'small', loading: isClearing }}
            cancelButtonProps={{ size: 'small' }}
            onConfirm={() => void handleClear()}
          >
            <button
              type="button"
              disabled={messages.length === 0}
              className="grid size-7 place-items-center rounded-md text-ink-3 transition hover:bg-white/[0.04] hover:text-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="清空对话"
            >
              <ClearOutlined className="text-[11.5px]" />
            </button>
          </Popconfirm>
        </Tooltip>
      </div>
    </div>
  );
}
