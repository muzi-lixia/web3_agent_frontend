import { useAppKitNetwork } from '@reown/appkit/react';
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';

import { networks } from '@/config/wallet';
import { ApiError, workflowApi } from '@/lib/api';
import { chainMeta } from '@/lib/format';
import { useAppStore } from '@/store/app-store';
import type { TxIntent, WorkflowStatus } from '@/types';

/** 卡片在某一刻的处境。后端状态是唯一事实来源，这里只是它的展示形态。 */
export type TxPhase =
  | 'confirm'
  | 'confirming'
  | 'sign'
  | 'signing'
  | 'reporting'
  | 'submitted'
  | 'settled'
  | 'failed'
  | 'aborted'
  | 'expired';

const PHASE_BY_STATE: Record<string, TxPhase> = {
  INTENT_CONFIRM: 'confirm',
  PREVIEW: 'sign',
  SUBMITTED: 'submitted',
  SETTLED: 'settled',
  FAILED: 'failed',
  ABORTED: 'aborted',
  EXPIRED_UNSIGNED: 'expired',
  EXPIRED_UNVERIFIED: 'expired',
};

/** 已广播的任务要等回执，轮询间隔取 5 秒：出块再快也不值得更密。 */
const POLL_MS = 5_000;

function describe(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  const message = error instanceof Error ? error.message : '操作失败，请重试';
  if (/user rejected|denied|4001/i.test(message)) return '你取消了签名';
  return message;
}

/**
 * 一笔转账从确认到落地的全过程。
 *
 * 状态推进两次都发生在服务端：`intent/confirm` 让任务进入待签名，`workflow/{id}`
 * 拿回执结算。钱包只负责签名和广播，本地的 phase 永远跟着服务端返回走。
 */
export function useTransferTask(taskId: string | null) {
  const token = useAppStore((state) => state.auth?.token ?? null);
  const walletChainId = useAppStore((state) => state.wallet?.chainId ?? null);
  const { address, chainId } = useAccount();
  const { switchNetwork } = useAppKitNetwork();
  const { sendTransactionAsync } = useSendTransaction();

  const [phase, setPhase] = useState<TxPhase>('confirm');
  const [txIntent, setTxIntent] = useState<TxIntent | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  /** 后端登记过的哈希。本地刚签完的名字后端可能还没收到，那种情况不值得继续轮询。 */
  const [serverHash, setServerHash] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 首帧还没拿到服务端状态时先别让用户点：此时卡片上的「待确认」可能已经过期或被拒绝。 */
  const [hydrated, setHydrated] = useState(!taskId);

  const apply = useCallback((status: WorkflowStatus) => {
    setPhase(PHASE_BY_STATE[status.state] ?? 'confirm');
    // 待签名参数只在 PREVIEW 下发，已广播后本地保留着，用于展示收款方和金额。
    if (status.txIntent) setTxIntent(status.txIntent);
    if (status.txHash) {
      setTxHash(status.txHash);
      setServerHash(status.txHash);
    }
    setExpiresAt(status.expiresAt);
    // 服务端有结论就用它的；没有结论时保留本地提示（比如哈希上报失败），
    // 否则下一轮轮询会把那条提示冲掉，用户再也没机会看到。
    const terminal = status.state === 'SETTLED' || status.state === 'FAILED' || status.state === 'ABORTED';
    setError((prev) => status.errorMsg ?? (terminal ? null : prev));
  }, []);

  // 刷新后卡片只剩 taskId，状态和参数都从服务端重新取。
  useEffect(() => {
    if (!taskId || !token) return;
    let alive = true;
    void workflowApi
      .status(token, taskId)
      .then((status) => {
        if (alive) apply(status);
      })
      .catch(() => {
        // 拉不到就停在初始态：用户点确认时会撞到同一个错误，那时再有上下文报出来。
      })
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, [taskId, token, apply]);

  // 已广播的任务持续核对回执，直到结算或失败。过期但已经上报哈希的也要继续：
  // 用户可能正是在过期之后才签的名，后端要靠回执把状态纠正回来。
  useEffect(() => {
    if (!taskId || !token) return;
    if (phase !== 'submitted' && !(phase === 'expired' && serverHash)) return;
    let alive = true;
    const timer = window.setInterval(() => {
      void workflowApi
        .status(token, taskId)
        .then((status) => {
          if (alive) apply(status);
        })
        .catch(() => {
          // 单次轮询失败不影响下一次，网络恢复后会自己跟上。
        });
    }, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [phase, taskId, token, serverHash, apply]);

  /** 提交认可或拒绝。拒绝直接结束任务，不会生成任何链上动作。 */
  const confirm = useCallback(
    async (accepted: boolean) => {
      if (!taskId || !token) return;
      setPhase('confirming');
      setError(null);
      try {
        const result = await workflowApi.confirm(token, taskId, accepted);
        if (result.status === 'REJECTED') {
          setPhase('aborted');
          return;
        }
        apply(await workflowApi.status(token, taskId));
      } catch (err) {
        setPhase(err instanceof ApiError && err.code === 'E506' ? 'expired' : 'confirm');
        setError(describe(err));
      }
    },
    [taskId, token, apply],
  );

  /** 用钱包签名并广播，然后把哈希交给后端登记。 */
  const send = useCallback(async () => {
    if (!txIntent || !taskId || !token) return;

    // 签名前先问一次后端：卡住用户手上一动不动的那张卡，可能已经在后台被判过期。
    // 过期的任务不再收哈希，签下去就是白花 gas，而且这笔交易再也不会被核对。
    let fresh: WorkflowStatus;
    try {
      fresh = await workflowApi.status(token, taskId);
    } catch (err) {
      setError(describe(err));
      return;
    }
    if (fresh.state !== 'PREVIEW') {
      apply(fresh);
      setError(fresh.errorMsg ?? '这笔任务已经不在待签名状态，按卡片上的最新状态处理');
      return;
    }

    if (!address) {
      setError('请先连接钱包');
      return;
    }
    if (address.toLowerCase() !== txIntent.from.toLowerCase()) {
      setError('当前钱包不是发起这笔交易的钱包，请切换回原账户');
      return;
    }
    // 交易参数绑定在任务建出来的那条链上，切链由用户在钱包里自己完成。
    if (chainId !== txIntent.chainId) {
      const target = networks.find((network) => Number(network.id) === txIntent.chainId);
      if (target) await switchNetwork(target);
      setError(`请把钱包切到 ${chainMeta(txIntent.chainId).name} 后重新发送`);
      return;
    }

    setPhase('signing');
    setError(null);
    try {
      const hash = await sendTransactionAsync({
        to: txIntent.to as `0x${string}`,
        value: BigInt(txIntent.value),
        data: txIntent.data as `0x${string}`,
      });
      setTxHash(hash);
      setPhase('reporting');
      try {
        await workflowApi.report(token, taskId, hash, 'broadcast');
      } catch (err) {
        // 交易已经出去了，界面必须按已广播走。后端结案后不再收哈希（E609），
        // 这笔交易只能让用户自己去浏览器看结果，卡片上仍留着哈希和链接。
        setError(`哈希上报失败（${describe(err)}），链上结果可能无法自动核对`);
      }
      setPhase('submitted');
    } catch (err) {
      setPhase('sign');
      setError(describe(err));
    }
  }, [address, apply, chainId, sendTransactionAsync, switchNetwork, taskId, token, txIntent]);

  // 已广播后后端不再回 txIntent（那是待签名参数），网络只能从登录时的链补。
  const taskChainId = txIntent?.chainId ?? walletChainId;

  return {
    phase,
    hydrated,
    txIntent,
    txHash,
    chainId: taskChainId,
    expiresAt,
    error,
    confirm,
    send,
  };
}
