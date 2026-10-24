import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Modal, Popconfirm, Select, Table, Tag } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useKnowledgeBases } from '@/components/knowledge/KnowledgeBaseSelect';
import { dateLabel, KnowledgeLayout, RequestError, useRagAccess } from '@/components/knowledge/shared';
import { ragApi } from '@/lib/api';
import type { KnowledgeBase } from '@/types/rag';

interface Values { name:string;description:string;status:'active'|'disabled' }
export function KnowledgeBasesPage() {
  const access=useRagAccess();const query=useKnowledgeBases();const client=useQueryClient();
  const [editing,setEditing]=useState<KnowledgeBase|null|undefined>(undefined);const [form]=Form.useForm<Values>();
  const save=useMutation({mutationFn:(values:Values)=>editing ? ragApi.updateKnowledgeBase(access.token,editing.id,values)
    : ragApi.createKnowledgeBase(access.token,{name:values.name,description:values.description || ''}),
    onSuccess:()=>{setEditing(undefined);void client.invalidateQueries({queryKey:['rag']});}});
  const status=useMutation({mutationFn:(kb:KnowledgeBase)=>ragApi.updateKnowledgeBase(access.token,kb.id,{status:kb.status==='active'?'disabled':'active'}),
    onSuccess:()=>void client.invalidateQueries({queryKey:['rag']})});
  const open=(kb:KnowledgeBase|null)=>{save.reset();setEditing(kb);form.setFieldsValue(kb ?? {name:'',description:'',status:'active'});};
  return <KnowledgeLayout title="知识库管理" description="用独立知识库组织资料。文档和检索按知识库隔离，所有当前知识库均为登录用户共享。" actions={<div className="flex gap-2"><Button icon={<ReloadOutlined />} onClick={()=>void query.refetch()}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={()=>open(null)}>新建知识库</Button></div>}>
    <RequestError error={query.error} onRetry={()=>void query.refetch()} /><RequestError error={status.error} />
    {!query.error && <div className="rounded-xl border border-line bg-panel p-4 sm:p-6"><Table<KnowledgeBase> rowKey="id" dataSource={query.data ?? []} loading={query.isLoading} pagination={false} scroll={{x:900}} columns={[
      {title:'知识库',key:'name',render:(_,k)=><div><Link to={`/knowledge?kb=${encodeURIComponent(k.id)}`} className="text-mint">{k.name}</Link><p className="mt-1 max-w-[260px] text-xs text-ink-3">{k.description || '暂无描述'}</p></div>},
      {title:'状态',key:'status',render:(_,k)=><Tag color={k.status==='active'?'success':'default'}>{k.status==='active'?'启用':'停用'}</Tag>},
      {title:'嵌入配置',key:'model',render:(_,k)=><div className="text-xs"><p>{k.embedding_provider} / {k.embedding_model}</p><p className="mt-1 text-ink-3">{k.embedding_dimension} 维 · {k.embedding_version}</p></div>},
      {title:'创建时间',dataIndex:'created_at',render:dateLabel},
      {title:'操作',key:'actions',render:(_,k)=><div className="flex gap-2"><Button size="small" onClick={()=>open(k)}>编辑</Button><Popconfirm title={k.status==='active'?'停用该知识库？':'重新启用该知识库？'} description="停用后无法上传或检索，已有文档和任务保留。" onConfirm={async()=>{try{await status.mutateAsync(k);}catch{/* Error displayed above. */}}}><Button size="small" disabled={status.isPending}>{k.status==='active'?'停用':'启用'}</Button></Popconfirm></div>},
    ]} /></div>}
    <Modal open={editing!==undefined && access.enabled} title={editing?'编辑知识库':'新建知识库'} onCancel={()=>{if(!save.isPending)setEditing(undefined);}} onOk={()=>form.submit()} confirmLoading={save.isPending} destroyOnClose>
      <Form form={form} layout="vertical" disabled={save.isPending} onFinish={v=>save.mutate(v)}>
        <Form.Item name="name" label="知识库名称" rules={[{required:true,whitespace:true,message:'请输入名称'},{max:100}]}><Input maxLength={100} /></Form.Item>
        <Form.Item name="description" label="描述"><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
        {editing && <Form.Item name="status" label="状态"><Select options={[{value:'active',label:'启用'},{value:'disabled',label:'停用'}]} /></Form.Item>}
        <p className="mb-4 text-xs leading-6 text-ink-3">新库使用当前服务的嵌入模型。模型配置不支持在此修改，以免已有向量与新查询不兼容。</p><RequestError error={save.error} />
      </Form>
    </Modal>
  </KnowledgeLayout>;
}
