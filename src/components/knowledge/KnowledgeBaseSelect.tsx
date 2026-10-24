import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';
import { ragApi } from '@/lib/api';
import { RequestError, useRagAccess } from './shared';

export function useKnowledgeBases(admin=true) {
  const access=useRagAccess();
  return useQuery({queryKey:['rag',access.identity,'knowledge-bases',admin],queryFn:()=>ragApi.knowledgeBases(access.token,admin),
    enabled:access.enabled,staleTime:10_000});
}

export function KnowledgeBaseSelect({ value,onChange,allowClear=false,disabled=false,includeDisabled=false }: {
  value?: string; onChange?: (value: string|undefined)=>void; allowClear?: boolean; disabled?: boolean; includeDisabled?: boolean;
}) {
  const query=useKnowledgeBases();
  return <div className="space-y-2"><Select className="w-full" aria-label="知识库" value={value} onChange={onChange} allowClear={allowClear}
    placeholder={allowClear ? '全部知识库' : '请选择知识库'} disabled={disabled || !!query.error} loading={query.isLoading}
    options={query.data?.map(k=>({value:k.id,label:`${k.name}${k.status==='disabled'?'（已停用）':''}`,disabled:!includeDisabled && k.status==='disabled'}))} />
    <RequestError error={query.error} onRetry={()=>void query.refetch()} /></div>;
}
