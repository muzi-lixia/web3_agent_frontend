import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

import { ArrowUp, Spinner, WalletIcon } from '@/components/ui/marks';
import { chainMeta } from '@/lib/format';
import type { WalletRef } from '@/types';

const MAX_LENGTH = 4000;

export function Composer({
  onSend,
  isSending,
  wallet,
  locked,
  onOpenWallet,
}: {
  onSend: (text: string) => void;
  isSending: boolean;
  wallet: WalletRef | null;
  /** /chat 需要 Bearer，未登录时输入框仍然可写，但发送会先拉登录弹窗 */
  locked: boolean;
  onOpenWallet: () => void;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.min(element.scrollHeight, 176)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !isSending;

  const submit = () => {
    const text = value.trim();
    if (!canSend || !text) return;
    onSend(text.slice(0, MAX_LENGTH));
    // 未登录时消息不会真的发出去（send 会改成弹登录框），输入内容留着别清
    if (!locked) setValue('');
  };

  return (
    <div className="relative shrink-0 border-t border-line bg-panel px-8 pt-3 pb-3 backdrop-blur">
      <div className="w-full">
        <div className="rounded-xl border border-line bg-panel/70 px-3 py-2.5 transition focus-within:border-mint/35 focus-within:bg-panel">
          <textarea
            ref={textareaRef}
            value={value}
            rows={1}
            maxLength={MAX_LENGTH}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={
              locked
                ? '先连接钱包并签名登录，再开始提问…'
                : '问点什么：查一下我的 ETH 和 USDC 余额…'
            }
            className="block max-h-[176px] w-full resize-none bg-transparent text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
            aria-label="聊天输入框"
          />

          <div className="mt-2 flex items-center gap-2">
            {wallet && (
              <button
                type="button"
                onClick={onOpenWallet}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-white/[0.03] px-2 text-[11.5px] text-ink-2 transition hover:border-mint/30 hover:text-ink"
                title={wallet.address}
              >
                <WalletIcon className="size-3.5" />
                {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
              </button>
            )}

            {wallet && (
              <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-white/[0.02] px-2 font-mono text-[10px] text-ink-3">
                {chainMeta(wallet.chainId).short}
                <span className="text-ink-3/85">{wallet.chainId}</span>
              </span>
            )}

            <span className="ml-auto hidden text-[10px] text-ink-3 sm:block">
              Enter 发送 · Shift + Enter 换行
            </span>

            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="发送"
              className={clsx(
                'grid size-8 shrink-0 place-items-center rounded-lg transition',
                canSend
                  ? 'bg-mint text-void hover:bg-mint-soft'
                  : 'cursor-not-allowed bg-panel-3 text-ink-3',
              )}
            >
              {isSending ? (
                <Spinner className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
