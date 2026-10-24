import { App as AntApp, Popconfirm } from 'antd';

import { SectionTitle } from '@/components/ui/atoms';
import { cancelChat } from '@/lib/inflight';
import { usePurgeData } from '@/hooks/use-history';
import { useAppStore } from '@/store/app-store';

/**
 * 合规删除入口。与顶部「清空对话」的区别：这里连长期记忆、用户档案一起删，不可恢复。
 * 后端 DELETE /api/v1/chat/memory 一次删干净，审计日志另存一条「删过」的记录。
 */
export function DataPrivacy() {
  const auth = useAppStore((state) => state.auth);
  const mockMode = useAppStore((state) => state.mockMode);
  const clearConversation = useAppStore((state) => state.clearConversation);
  const { purge, isPurging } = usePurgeData();
  const { message: toast } = AntApp.useApp();

  const loggedIn = Boolean(auth && auth.expiresAt > Date.now());

  const handlePurge = async () => {
    // 先把在飞的那一轮停掉，否则它会在删除之后再把答案写回库里。
    cancelChat();
    try {
      const result = await purge();
      clearConversation();
      if (!result) {
        toast.success('本地记录已清空');
        return;
      }
      toast.success(
        `已删除 ${result.deletedMessages} 条消息、${result.deletedMemories} 条长期记忆` +
          `、${result.deletedSummaries} 份摘要${result.deletedProfile ? '，以及用户档案' : ''}`,
      );
    } catch {
      toast.error('删除失败，服务端未确认，本地记录保持原样');
    }
  };

  return (
    <div>
      <SectionTitle>数据与隐私</SectionTitle>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">
        清空对话只删消息与摘要。彻底删除会连长期记忆和用户档案一起删，后端不可恢复。
      </p>

      <Popconfirm
        title="删除该地址的全部数据？"
        description="消息、摘要、用户档案、长期记忆一次性删除，不可恢复。审计日志保留一条删除记录。"
        okText="全部删除"
        cancelText="取消"
        okButtonProps={{ danger: true, size: 'small', loading: isPurging }}
        cancelButtonProps={{ size: 'small' }}
        onConfirm={() => void handlePurge()}
        disabled={!loggedIn || mockMode}
      >
        <button
          type="button"
          disabled={!loggedIn || mockMode || isPurging}
          className="mt-2 w-full rounded-lg border border-danger/25 bg-danger/[0.04] py-1.5 text-[11.5px] text-danger transition hover:bg-danger/[0.08] disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-ink-3"
        >
          {isPurging ? '删除中…' : '删除我的全部数据'}
        </button>
      </Popconfirm>

      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-3">
        {mockMode
          ? 'Mock 模式不发请求，该按钮不可用。'
          : loggedIn
            ? '仅作用于当前登录钱包地址。'
            : '需要先连接钱包并登录。'}
      </p>
    </div>
  );
}
