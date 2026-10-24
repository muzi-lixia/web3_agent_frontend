import { ChatKnowledgeBase } from '@/components/knowledge/ChatKnowledgeBase';
import { Composer } from '@/components/chat/Composer';
import { MessageList } from '@/components/chat/MessageList';
import { SessionHeader } from '@/components/chat/SessionHeader';
import { useChat } from '@/hooks/use-chat';
import { useLoadEarlier } from '@/hooks/use-history';
import { useAppStore } from '@/store/app-store';

export function ChatPage() {
  const messages = useAppStore((state) => state.messages);
  const wallet = useAppStore((state) => state.wallet);
  const auth = useAppStore((state) => state.auth);
  const openWallet = useAppStore((state) => state.openWallet);
  const hasEarlier = useAppStore((state) => state.history.hasMore);

  const { send, isSending } = useChat();
  const { loadEarlier, isLoadingEarlier } = useLoadEarlier();
  const locked = !auth || auth.expiresAt <= Date.now();

  const retryFrom = (assistantId: string) => {
    const index = messages.findIndex((message) => message.id === assistantId);
    const start = index < 0 ? messages.length - 1 : index - 1;
    for (let cursor = start; cursor >= 0; cursor -= 1) {
      const message = messages[cursor];
      if (message.role === 'user') {
        // 带上原消息的幂等键：上次可能是客户端超时，服务端其实已经跑完或还在跑
        void send(message.content, message.requestKey);
        return;
      }
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SessionHeader messages={messages} />
      <ChatKnowledgeBase disabled={isSending} />
      <MessageList
        messages={messages}
        wallet={wallet}
        hasEarlier={hasEarlier}
        loadingEarlier={isLoadingEarlier}
        onLoadEarlier={loadEarlier}
        onPrompt={(text) => void send(text)}
        onRetry={retryFrom}
      />
      <Composer
        onSend={(text) => void send(text)}
        isSending={isSending}
        wallet={wallet}
        locked={locked}
        onOpenWallet={openWallet}
      />
    </div>
  );
}
