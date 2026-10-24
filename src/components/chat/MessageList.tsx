import { useEffect, useRef, useState } from 'react';

import { MessageItem } from '@/components/chat/MessageItem';
import { EmptyState } from '@/components/chat/EmptyState';
import { ChevronDown } from '@/components/ui/marks';
import type { UiMessage } from '@/store/app-store';
import type { WalletRef } from '@/types';

export function MessageList({
  messages,
  wallet,
  hasEarlier,
  loadingEarlier,
  onLoadEarlier,
  onRetry,
  onPrompt,
}: {
  messages: UiMessage[];
  wallet: WalletRef | null;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  onLoadEarlier: () => Promise<unknown>;
  onRetry: (assistantId: string) => void;
  onPrompt: (text: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  const lastMessage = messages[messages.length - 1];
  const lastStatus = lastMessage?.status;
  const lastId = lastMessage?.id;

  useEffect(() => {
    if (!atBottom) return;
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length, lastStatus, lastId, atBottom]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    setAtBottom(distance < 140);
  };

  const scrollToBottom = () => {
    setAtBottom(true);
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  };

  /** 早先的记录插在队首会把当前内容整体推下去，插完补回高度差，视线才停在原地。 */
  const loadEarlier = async () => {
    const element = scrollRef.current;
    const before = element?.scrollHeight ?? 0;
    await onLoadEarlier();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const current = scrollRef.current;
        if (current) current.scrollTop += current.scrollHeight - before;
      });
    });
  };

  if (messages.length === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full w-full flex-col px-8">
          <EmptyState onPrompt={onPrompt} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto">
        <div className="w-full space-y-6 px-8 py-6">
          {hasEarlier && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void loadEarlier()}
                disabled={loadingEarlier}
                className="rounded-full border border-line-strong bg-panel-2/80 px-3 py-1 text-[11.5px] text-ink-2 transition hover:border-mint/30 hover:text-mint disabled:cursor-wait disabled:text-ink-3"
              >
                {loadingEarlier ? '读取中…' : '加载更早的记录'}
              </button>
            </div>
          )}
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              wallet={wallet}
              onRetry={message.role === 'assistant' ? () => onRetry(message.id) : undefined}
            />
          ))}
          <div ref={bottomRef} className="h-px" />
        </div>
      </div>

      {!atBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line-strong bg-panel-2/95 px-3 py-1.5 text-[11.5px] text-ink-2 shadow-lg backdrop-blur transition hover:border-mint/30 hover:text-mint"
        >
          <ChevronDown className="size-3" />
          回到最新
        </button>
      )}
    </div>
  );
}
