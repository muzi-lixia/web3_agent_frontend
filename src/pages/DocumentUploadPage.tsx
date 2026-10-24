import { CloudUploadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Checkbox, Form, Input, InputNumber, Select, Upload } from 'antd';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KnowledgeLayout, RequestError, useRagAccess } from '@/components/knowledge/shared';
import { KnowledgeBaseSelect } from '@/components/knowledge/KnowledgeBaseSelect';
import { ragApi } from '@/lib/api';
import { newId, useAppStore } from '@/store/app-store';
import type { RagMetadata } from '@/types/rag';

interface Values { kb_id: string; title: string; chain_id?: number; protocol_id?: string; doc_category: string; version: string; reviewed: boolean; valid_from: string; valid_until?: string }
const localNow = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); };

export function DocumentUploadPage() {
  const access = useRagAccess();
  const [form] = Form.useForm<Values>();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const uploadKey = useRef<{ file: File; json: string; key: string } | null>(null);
  const navigate = useNavigate();
  const client = useQueryClient();
  const upload = useMutation({
    mutationFn: async (values: Values) => {
      if (!file) throw new Error('请先选择文档。');
      const metadata: RagMetadata = { ...values, title: values.title.trim(), 
        version: values.version.trim(), chain_id: values.chain_id ?? null, protocol_id: values.protocol_id?.trim() || null,
        valid_from: new Date(values.valid_from).toISOString(), valid_until: values.valid_until ? new Date(values.valid_until).toISOString() : null };
      const json = JSON.stringify(metadata);
      if (!uploadKey.current || uploadKey.current.file !== file || uploadKey.current.json !== json) uploadKey.current = { file, json, key: newId() };
      const token = access.token;
      const result = await ragApi.upload(token, file, metadata, uploadKey.current.key);
      if (useAppStore.getState().auth?.token === token) {
        void client.invalidateQueries({ queryKey: ['rag'] });
        navigate(`/knowledge/jobs?job=${encodeURIComponent(result.data.job_id)}`);
      }
      return result;
    },
  });
  return <KnowledgeLayout title="上传文档" description="将已核验的资料加入共享知识库。提交后自动完成解析、切块、向量化和入库。" actions={<Link to="/knowledge"><Button>返回知识库</Button></Link>}>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
      <div className="rounded-xl border border-line bg-panel p-4 sm:p-6">
        <Form form={form} layout="vertical" disabled={upload.isPending} initialValues={{ kb_id: 'default', doc_category: 'faq', version: 'v1', reviewed: false, valid_from: localNow() }} onFinish={v => { if (!file) { setFileError('请先选择一个文档。'); return; } upload.mutate(v); }}>
          <Form.Item name="kb_id" label="目标知识库" rules={[{required:true,message:'请选择目标知识库'}]}><KnowledgeBaseSelect disabled={upload.isPending} /></Form.Item>
          <Form.Item label="文档文件" required>
            <Upload.Dragger accept=".md,.txt,.pdf" multiple={false} showUploadList={false} disabled={upload.isPending} beforeUpload={selected => {
              if (!/\.(md|txt|pdf)$/i.test(selected.name)) { setFileError('请选择 Markdown、TXT 或 PDF 文件。'); return Upload.LIST_IGNORE; }
              if (!selected.size || selected.size > 5_000_000) { setFileError('文档不能为空，且不能超过 5 MB。'); return Upload.LIST_IGNORE; }
              setFile(selected); setFileError(''); upload.reset();
              if (!form.getFieldValue('title')) form.setFieldValue('title', selected.name.replace(/\.[^.]+$/, '').slice(0,200));
              return false;
            }}>
              <CloudUploadOutlined className="mb-3 text-3xl text-mint" />
              <p className="text-sm">点击选择或拖入文档</p><p className="mt-2 text-xs text-ink-3">Markdown / TXT / 文本型 PDF，最大 5 MB</p>
            </Upload.Dragger>
            {file && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-mint/[0.06] px-3 py-2 text-xs"><FileTextOutlined className="text-mint" /><span className="min-w-0 flex-1 break-all">{file.name}</span><span className="text-ink-3">{(file.size/1000).toFixed(1)} KB</span><Button size="small" type="text" onClick={() => setFile(null)}>移除</Button></div>}
            {fileError && <p role="alert" className="mt-2 text-danger">{fileError}</p>}
          </Form.Item>
          <Form.Item name="title" label="文档标题" rules={[{ required: true, whitespace: true, message: '请输入文档标题' }, { max: 200 }]}><Input maxLength={200} placeholder="例如：钱包连接与常见问题" /></Form.Item>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="doc_category" label="文档分类" rules={[{ required: true }]}><Select options={['faq','term','wallet','chain','contract','stake','swap','nft','risk','version'].map(value => ({ value, label: ({ faq:'常见问题', term:'术语概念', wallet:'钱包', chain:'公链', contract:'合约', stake:'质押', swap:'兑换', nft:'NFT', risk:'风险', version:'版本公告' } as Record<string,string>)[value] }))} /></Form.Item>
            <Form.Item name="version" label="文档版本" rules={[{ required: true, whitespace: true, message: '请输入版本号' }, { max: 64 }]}><Input maxLength={64} placeholder="v1" /></Form.Item>
            <Form.Item name="chain_id" label="链 ID（可选）"><InputNumber className="!w-full" min={1} max={2147483647} precision={0} placeholder="留空表示通用文档" /></Form.Item>
            <Form.Item name="protocol_id" label="协议标识（可选）" rules={[{ pattern: /^[A-Za-z0-9_.:-]{1,128}$/, message: '使用字母、数字、下划线、点、冒号或短横线' }]}><Input maxLength={128} placeholder="例如 uniswap，通用文档留空" /></Form.Item>
            <Form.Item name="valid_from" label="生效时间（本地时间）" rules={[{ required: true, message: '请选择生效时间' }, { validator: (_, value) => !value || new Date(value).getTime() <= Date.now() ? Promise.resolve() : Promise.reject(new Error('不支持尚未生效的文档')) }]}><Input type="datetime-local" /></Form.Item>
            <Form.Item name="valid_until" label="过期时间（可选）" dependencies={['valid_from']} rules={[{ validator: (_, value) => !value || (new Date(value).getTime() > Date.now() && new Date(value) > new Date(form.getFieldValue('valid_from'))) ? Promise.resolve() : Promise.reject(new Error('过期时间应晚于当前时间及生效时间')) }]}><Input type="datetime-local" /></Form.Item>
          </div>
          <Form.Item name="reviewed" valuePropName="checked" rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('请先核验文档来源和适用范围')) }]}><Checkbox>我已核验文档内容、版本和适用范围，同意发布至共享知识库</Checkbox></Form.Item>
          <RequestError error={upload.error} />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-ink-3">上传成功后将自动进入任务详情。</span><Button type="primary" htmlType="submit" loading={upload.isPending} icon={<CloudUploadOutlined />}>上传并处理</Button></div>
        </Form>
      </div>
      <aside className="space-y-4 rounded-xl border border-line bg-panel p-5"><h2 className="font-semibold">资料准备</h2><p className="text-xs leading-6 text-ink-3">优先使用协议官方文档、产品手册和已核验 FAQ。不同协议或版本建议分别上传。</p><Alert type="info" showIcon message="PDF 需包含可提取文本" description="扫描件请先完成 OCR。TXT 和 Markdown 请使用 UTF-8 编码。" /><p className="text-xs leading-6 text-ink-3">文档用于静态知识问答。余额、奖励和交易状态等实时信息仍由链上工具查询。</p><Link className="text-xs text-mint" to="/knowledge/jobs">查看处理任务 →</Link></aside>
    </div>
  </KnowledgeLayout>;
}
