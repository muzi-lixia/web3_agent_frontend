import { BookOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Descriptions, Drawer, Empty, Form, Input, InputNumber, Popconfirm, Select, Table, Tag } from 'antd';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { dateLabel, KnowledgeLayout, Pager, RequestError, safeSource, useRagAccess } from '@/components/knowledge/shared';
import { KnowledgeBaseSelect, useKnowledgeBases } from '@/components/knowledge/KnowledgeBaseSelect';
import { ragApi } from '@/lib/api';
import type { RagDocument, RagSearch } from '@/types/rag';

function DocumentStatus({ document }: { document: RagDocument }) {
  if(document.status === 'disabled') return <Tag>已停用</Tag>;
  if(document.status === 'superseded') return <Tag color="default">历史版本</Tag>;
  if(document.valid_until && new Date(document.valid_until).getTime() <= Date.now()) return <Tag color="warning">已过期</Tag>;
  return <Tag color="success">可检索</Tag>;
}

export function DocumentsPage() {
  const access = useRagAccess(); const client = useQueryClient();
  const [offset,setOffset] = useState(0);
  const [params,setParams] = useSearchParams(); const kbId=params.get('kb') || undefined;
  const bases=useKnowledgeBases();
  const [detail,setDetail] = useState<RagDocument | null>(null);
  const [form] = Form.useForm<RagSearch>();
  const documents = useQuery({ queryKey:['rag',access.identity,'documents',offset,kbId], queryFn:() => ragApi.documents(access.token,offset,kbId), enabled:access.enabled,
    refetchInterval:q => q.state.error ? false : 10000 });
  const disable = useMutation({ mutationFn:(id: string) => ragApi.disable(access.token,id), onSuccess:() => {
    setDetail(null); void client.invalidateQueries({ queryKey:['rag'] }); search.reset();
  } });
  const search = useMutation({ mutationFn:(value: RagSearch) => ragApi.search(access.token,{ ...value,query_str:value.query_str.trim(),protocol_id:value.protocol_id?.trim() || null,doc_category:value.doc_category || null,chain_id:value.chain_id ?? null }) });
  return <KnowledgeLayout title="文档知识库" description="管理 Web3 静态知识文档，查看版本与来源，并验证已入库内容的检索结果。" actions={<div className="flex gap-2"><Button icon={<ReloadOutlined />} onClick={() => void documents.refetch()}>刷新</Button><Link to="/knowledge/upload"><Button type="primary" icon={<PlusOutlined />}>上传文档</Button></Link></div>}>
    <RequestError error={documents.error} onRetry={() => void documents.refetch()} /><RequestError error={disable.error} />
    {!documents.error && <section className="space-y-4 rounded-xl border border-line bg-panel p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-semibold"><BookOutlined className="text-mint" />已入库文档</h2><div className="w-full sm:w-64"><KnowledgeBaseSelect value={kbId} allowClear includeDisabled onChange={value=>{setOffset(0);setParams(value ? {kb:value}:{});}} /></div><span className="text-xs text-ink-3">每 10 秒自动更新</span></div>
      <Table<RagDocument> rowKey="document_id" dataSource={documents.data?.items ?? []} loading={documents.isPending} pagination={false} scroll={{ x:920 }} locale={{ emptyText:<Empty description="知识库中还没有文档"><Link to="/knowledge/upload"><Button type="primary">上传第一份文档</Button></Link></Empty> }} columns={[
        { title:'文档标题',key:'title',render:(_,r) => <div className="max-w-[280px]"><button onClick={() => setDetail(r)} className="block max-w-full truncate text-mint hover:underline">{r.title}</button>{r.source_url && <a href={safeSource(r.source_url)} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-ink-3 hover:text-ink">{r.source_url}</a>}</div> },
        { title:'知识库',key:'kb',render:(_,r)=>bases.data?.find(k=>k.id===r.kb_id)?.name ?? r.kb_id },
        { title:'分类 / 协议',key:'category',render:(_,r) => <><Tag>{r.doc_category}</Tag><div className="mt-1 text-xs text-ink-3">{r.protocol_id ?? '通用文档'}{r.chain_id ? ` · 链 ${r.chain_id}` : ''}</div></> },
        { title:'版本',dataIndex:'version' },{ title:'状态',key:'status',render:(_,r) => <DocumentStatus document={r} /> },
        { title:'切片',dataIndex:'chunks' },{ title:'更新时间',dataIndex:'updated_at',render:dateLabel },
        { title:'操作',key:'action',render:(_,r) => <div className="flex gap-2"><Button size="small" onClick={() => setDetail(r)}>详情</Button>{r.status === 'active' && <Popconfirm title="停用这份文档？" description="停用后将不再用于新的知识检索，历史内容保留。" onConfirm={async () => { try { await disable.mutateAsync(r.document_id); } catch { /* RequestError displays the failure. */ } }} okText="停用" cancelText="取消"><Button size="small" danger disabled={disable.isPending} loading={disable.isPending && disable.variables === r.document_id}>停用</Button></Popconfirm>}</div> },
      ]} /><Pager offset={offset} more={documents.data?.has_more ?? false} loading={documents.isFetching} onChange={setOffset} />
    </section>}
    <section className="space-y-4 rounded-xl border border-line bg-panel p-4 sm:p-6"><div><h2 className="flex items-center gap-2 font-semibold"><SearchOutlined className="text-mint" />检索验证</h2><p className="mt-2 text-xs leading-5 text-ink-3">输入一个问题，查看知识库返回的原文片段。通用问题可以不填过滤条件。</p></div>
      <Form form={form} layout="vertical" initialValues={{kb_id:'default'}} disabled={search.isPending} onFinish={value => search.mutate(value)}>
        <Form.Item name="kb_id" label="检索知识库" rules={[{required:true,message:'请选择知识库'}]}><KnowledgeBaseSelect disabled={search.isPending} /></Form.Item>
        <Form.Item name="query_str" label="知识问题" rules={[{ required:true,whitespace:true,message:'请输入要检索的问题' }]}><Input.TextArea rows={2} maxLength={4000} placeholder="例如：什么是 Gas？钱包授权失败有哪些常见原因？" /></Form.Item>
        <div className="grid gap-x-3 sm:grid-cols-3"><Form.Item name="chain_id" label="链 ID（可选）"><InputNumber className="!w-full" min={1} max={2147483647} precision={0} placeholder="不限链" /></Form.Item><Form.Item name="protocol_id" label="协议标识（可选）" rules={[{ pattern:/^[A-Za-z0-9_.:-]{1,128}$/,message:'协议标识格式不正确' }]}><Input maxLength={128} placeholder="不限协议" /></Form.Item><Form.Item name="doc_category" label="分类（可选）"><Select allowClear placeholder="全部分类" options={Array.from(new Set(['faq','term','wallet','chain','contract','stake','swap','nft','risk','version',...(documents.data?.items.map(d => d.doc_category) ?? [])])).map(value => ({value,label:value}))} /></Form.Item></div>
        <div className="flex justify-end gap-2"><Button onClick={() => { form.resetFields(); search.reset(); }}>清空</Button><Button type="primary" htmlType="submit" loading={search.isPending} icon={<SearchOutlined />}>检索知识库</Button></div>
      </Form>
      <RequestError error={search.error} />
      {search.data?.status === 'empty' && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={search.data.message ?? '没有找到匹配文档，请调整问题或过滤条件。'} />}
      {search.data?.status === 'invalid' && <Alert type="warning" showIcon message={search.data.message ?? '请检查过滤条件'} />}
      {search.data?.status === 'success' && <div className="space-y-3" aria-live="polite"><p className="text-xs text-ink-3">找到 {search.data.hits.length} 个相关片段</p>{search.data.hits.map(hit => <article key={hit.chunk_id} className="rounded-lg border border-line bg-void/50 p-4"><div className="mb-3 flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-medium"><span className="mr-2 text-mint">[{hit.id}]</span>{hit.title} · {hit.section}</h3><Tag>{hit.doc_category}</Tag></div><p className="whitespace-pre-wrap break-words text-[13px] leading-7 text-ink-2">{hit.content}</p><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">{hit.source_url && <a className="break-all text-mint hover:underline" href={safeSource(hit.source_url)} target="_blank" rel="noreferrer">查看原文 ↗</a>}<span>{hit.page_number ? `第 ${hit.page_number}${hit.page_end && hit.page_end!==hit.page_number ? `-${hit.page_end}` : ''} 页 · ` : ''}{hit.token_count_method === 'approx_v1' && hit.token_count > 0 ? `约 ${hit.token_count} tokens · ` : ''}{hit.version} · {hit.protocol_id ?? '通用'} · {hit.chain_id ? `链 ${hit.chain_id}` : '不限链'}</span></div></article>)}</div>}
    </section>
    <Drawer open={!!detail && access.enabled} title="文档详情" width={520} onClose={() => setDetail(null)}>{detail && <div className="space-y-5"><h2 className="text-lg font-semibold">{detail.title}</h2><DocumentStatus document={detail} /><Descriptions column={1} size="small" bordered items={[
      { key:'id',label:'文档 ID',children:<span className="break-all font-mono text-xs">{detail.document_id}</span> },{ key:'source',label:'来源',children:detail.source_url ? <a href={safeSource(detail.source_url)} target="_blank" rel="noreferrer" className="break-all text-mint">{detail.source_url}</a> : '上传文档' },
      { key:'kb',label:'知识库',children:bases.data?.find(k=>k.id===detail.kb_id)?.name ?? detail.kb_id },{ key:'model',label:'嵌入模型',children:`${detail.embedding_model} · ${detail.embedding_dimension} 维 · ${detail.embedding_version}` },
      { key:'category',label:'分类',children:detail.doc_category },{ key:'protocol',label:'协议',children:detail.protocol_id ?? '通用' },{ key:'chain',label:'链 ID',children:detail.chain_id ?? '通用' },{ key:'version',label:'版本',children:detail.version },{ key:'chunks',label:'切片数量',children:detail.chunks },{ key:'valid',label:'生效时间',children:dateLabel(detail.valid_from) },{ key:'until',label:'过期时间',children:dateLabel(detail.valid_until) },{ key:'updated',label:'索引更新时间',children:dateLabel(detail.updated_at) },
    ]} /><p className="text-xs leading-6 text-ink-3">可按这份文档的链、协议和分类验证召回。相同范围的其他文档也可能出现在结果中。</p><Button block icon={<SearchOutlined />} onClick={() => { form.setFieldsValue({ kb_id:detail.kb_id, chain_id:detail.chain_id,protocol_id:detail.protocol_id,doc_category:detail.doc_category }); search.reset();setDetail(null); }}>带入此范围检索</Button></div>}</Drawer>
  </KnowledgeLayout>;
}
