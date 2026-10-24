import { ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Descriptions, Empty, Progress, Steps, Table } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { dateLabel, JobStatus, KnowledgeLayout, Pager, RequestError, stageLabels, useRagAccess } from '@/components/knowledge/shared';
import { KnowledgeBaseSelect } from '@/components/knowledge/KnowledgeBaseSelect';
import { ragApi } from '@/lib/api';
import type { RagJob } from '@/types/rag';

export function DocumentJobsPage() {
  const access = useRagAccess(); const client = useQueryClient();
  const [offset,setOffset] = useState(0);
  const [params,setParams] = useSearchParams(); const jobId = params.get('job'); const kbId=params.get('kb') || undefined;
  const jobs = useQuery({ queryKey: ['rag',access.identity,'jobs',offset,kbId], queryFn: () => ragApi.jobs(access.token,offset,kbId), enabled: access.enabled,
    refetchInterval: query => query.state.error ? false : 4000 });
  const selected = useQuery({ queryKey: ['rag',access.identity,'job',jobId], queryFn: () => ragApi.job(access.token,jobId!), enabled: access.enabled && !!jobId,
    refetchInterval: q => q.state.error || (q.state.data && ['succeeded','failed'].includes(q.state.data.status)) ? false : 2000 });
  const retry = useMutation({ mutationFn: (id: string) => ragApi.retry(access.token,id), onSuccess: () => { void client.invalidateQueries({ queryKey:['rag'] }); } });
  const job = selected.data;
  useEffect(() => { if (job?.status === 'succeeded') void client.invalidateQueries({ queryKey:['rag',access.identity,'documents'] }); },[job?.status,access.identity,client]);
  const stages = ['loading','parsing','chunking','embedding','indexing','succeeded'];
  const retryButton = (value: RagJob) => value.status === 'failed' && <Button size="small" loading={retry.isPending && retry.variables === value.job_id} disabled={retry.isPending} onClick={() => retry.mutate(value.job_id)}>重试</Button>;
  return <KnowledgeLayout title="处理任务" description="查看文档解析与入库进度。关闭页面不会中断后台任务，失败后可在这里重新处理。" actions={<div className="flex gap-2"><Button icon={<ReloadOutlined />} onClick={() => { void jobs.refetch(); if(jobId) void selected.refetch(); }}>刷新</Button><Link to="/knowledge/upload"><Button type="primary">上传文档</Button></Link></div>}>
    <RequestError error={jobs.error} onRetry={() => void jobs.refetch()} /><RequestError error={selected.error} onRetry={() => void selected.refetch()} /><RequestError error={retry.error} />
    {jobId && selected.isPending && <div className="rounded-xl border border-line bg-panel p-6 text-ink-3">正在读取任务详情…</div>}
    {job && !selected.error && <section className="space-y-5 rounded-xl border border-line bg-panel p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="mb-1 text-xs text-ink-3">任务详情</div><h2 className="break-all text-base font-semibold">{job.metadata.title}</h2></div><div className="flex items-center gap-2"><JobStatus job={job} />{retryButton(job)}<Button type="text" size="small" onClick={() => setParams(kbId ? {kb:kbId} : {})}>收起</Button></div></div>
      <div className="overflow-x-auto pb-2"><Steps className="min-w-[620px]" size="small" current={job.status === 'queued' ? -1 : Math.max(0,stages.indexOf(job.stage))} status={job.status === 'failed' ? 'error' : job.status === 'succeeded' ? 'finish' : 'process'} items={stages.map(stage => ({ title:stageLabels[stage] }))} /></div>
      {job.total_chunks > 0 && <div><div className="flex justify-between text-xs text-ink-3"><span>向量化切片</span><span>{job.embedded_chunks} / {job.total_chunks}</span></div><Progress percent={Math.round(job.embedded_chunks/job.total_chunks*100)} status={job.status === 'failed' ? 'exception' : job.status === 'succeeded' ? 'success' : 'normal'} /></div>}
      <Descriptions size="small" column={{ xs:1,sm:2 }} items={[{ key:'kb',label:'知识库',children:job.kb_id },{ key:'id',label:'任务 ID',children:<span className="break-all font-mono text-xs">{job.job_id}</span> },{ key:'file',label:'文件',children:job.filename },{ key:'time',label:'提交时间',children:dateLabel(job.created_at) },{ key:'try',label:'处理次数',children:job.attempts }]} />
      {job.error && <Alert type="error" showIcon message={job.error.message} description={`${job.error.code} · 可先检查文件或服务，再重试；修改资料后请重新上传。`} />}
      {job.status === 'succeeded' && <Alert type="success" showIcon message="文档已入库" description={<div className="space-y-2"><p className="break-all font-mono text-xs">{job.document_id}</p><Link className="text-mint" to="/knowledge">前往知识库查看与检索 →</Link></div>} />}
    </section>}
    {!jobs.error && <section className="space-y-4 rounded-xl border border-line bg-panel p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">任务记录</h2><div className="w-full sm:w-64"><KnowledgeBaseSelect value={kbId} allowClear includeDisabled onChange={value=>{setOffset(0);const next=Object.fromEntries(params);if(value)next.kb=value;else delete next.kb;setParams(next);}} /></div></div><Table<RagJob> rowKey="job_id" dataSource={jobs.data?.items ?? []} loading={jobs.isPending} pagination={false} scroll={{ x:850 }} locale={{ emptyText:<Empty description="还没有处理任务"><Link to="/knowledge/upload">上传第一份文档</Link></Empty> }} columns={[
      { title:'文档',key:'title',render:(_,r) => <button className="text-left text-mint hover:underline" onClick={() => setParams({...Object.fromEntries(params),job:r.job_id})}><span className="block max-w-[260px] truncate">{r.metadata.title}</span><span className="block max-w-[260px] truncate text-xs text-ink-3">{r.filename}</span></button> },
      { title:'状态',key:'status',render:(_,r) => <JobStatus job={r} /> },
      { title:'处理环节',dataIndex:'stage',render:(value: string) => stageLabels[value] ?? value },
      { title:'向量化切片',key:'chunks',render:(_,r) => r.total_chunks ? `${r.embedded_chunks} / ${r.total_chunks}` : '—' },
      { title:'提交时间',dataIndex:'created_at',render:dateLabel },
      { title:'操作',key:'actions',render:(_,r) => <div className="flex gap-2"><Button size="small" onClick={() => setParams({...Object.fromEntries(params),job:r.job_id})}>详情</Button>{retryButton(r)}</div> },
    ]} /><Pager offset={offset} more={jobs.data?.has_more ?? false} loading={jobs.isFetching} onChange={setOffset} /></section>}
  </KnowledgeLayout>;
}
