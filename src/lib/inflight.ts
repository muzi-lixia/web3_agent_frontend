/**
 * 在飞的聊天请求。清空对话、清除数据时要把服务端那一轮一起取消：
 * 界面上的气泡可以就地撤掉，但请求不取消的话，后端还会跑完并把答案写进库里。
 */
let controller: AbortController | null = null;

/** 新一轮开始。同一时刻只允许一个，前一个由调用方保证已经收尾。 */
export function chatSignal(): AbortSignal {
  controller = new AbortController();
  return controller.signal;
}

export function cancelChat(): void {
  controller?.abort();
  controller = null;
}
