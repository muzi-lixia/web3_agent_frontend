import { Select } from 'antd';
import { useEffect } from 'react';
import { useKnowledgeBases } from './KnowledgeBaseSelect';
import { useRagAccess } from './shared';
import { useAppStore } from '@/store/app-store';

export function ChatKnowledgeBase({disabled=false}:{disabled?:boolean}) {
  const access=useRagAccess();const query=useKnowledgeBases(false);
  const selected=useAppStore(s=>s.knowledgeBaseId);const choose=useAppStore(s=>s.setKnowledgeBaseId);

  // 收起的库里如果只剩一个，把持久化的旧 id 拉回这一个，
  // 否则切换器不见了、请求还在用已删库的 id。
  const only=query.data?.length===1?query.data[0]:null;
  useEffect(()=>{ if(only && selected!==only.id) choose(only.id); },[only,selected,choose]);

  // 只有一个库时选择器无事可做：后端不传 knowledgeBaseId 也会落到 default，留着只是一行占位。
  if(!access.enabled || query.error || !query.data || query.data.length < 2) return null;
  return <div className="flex shrink-0 items-center gap-3 border-b border-line/60 px-4 py-2 text-xs text-ink-3">
    <span>问答知识库</span><Select size="small" aria-label="问答知识库" className="w-48" value={selected} onChange={choose} disabled={disabled}
      options={query.data.map(k=>({value:k.id,label:k.name}))} />
    <span className="hidden sm:inline">文档问答仅检索当前库，链上查询不受影响</span>
  </div>;
}
