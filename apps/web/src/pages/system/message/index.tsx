import { useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, App as AntdApp } from 'antd';
import { PlusOutlined, SendOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { messageApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

const CHANNELS = [
  { label: '站内信', value: 'INTERNAL' },
  { label: '邮件', value: 'EMAIL' },
  { label: '短信', value: 'SMS' },
  { label: 'Webhook', value: 'WEBHOOK' },
];

function TemplatePanel() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['msg-tpl', page], queryFn: () => messageApi.listTemplate({ page, pageSize: 10 }) });

  const save = useMutation({
    mutationFn: (v: any) => (editing ? messageApi.updateTemplate(editing.id, v) : messageApi.createTemplate(v)),
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['msg-tpl'] });
    },
  });

  const columns = [
    { title: '名称', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code' },
    { title: '通道', dataIndex: 'channel', render: (v: string) => <Tag>{CHANNELS.find((c) => c.value === v)?.label ?? v}</Tag> },
    { title: '标题', dataIndex: 'title' },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="system:message:edit">
            <a onClick={() => { setEditing(record); form.setFieldsValue(record); setOpen(true); }}>编辑</a>
          </Access>
          <Access perm="system:message:delete">
            <Popconfirm title="确认删除?" onConfirm={async () => { await messageApi.removeTemplate([record.id]); message.success('删除成功'); qc.invalidateQueries({ queryKey: ['msg-tpl'] }); }}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Access perm="system:message:add">
        <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>
          新增模板
        </Button>
      </Access>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.list} pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }} />
      <Modal open={open} title={editing ? '编辑模板' : '新增模板'} onOk={() => form.submit()} onCancel={() => setOpen(false)} destroyOnClose width={600}>
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="编码" name="code" rules={[{ required: true }]}><Input disabled={!!editing} /></Form.Item>
          <Form.Item label="通道" name="channel" initialValue="INTERNAL"><Select options={CHANNELS} /></Form.Item>
          <Form.Item label="标题(支持 {{var}})" name="title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="内容(支持 {{var}})" name="content" rules={[{ required: true }]}><Input.TextArea rows={5} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function SendPanel() {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const send = useMutation({
    mutationFn: (v: any) => {
      const userIds = v.userIds ? String(v.userIds).split(',').map((s: string) => parseInt(s.trim(), 10)).filter(Boolean) : undefined;
      return messageApi.send({ ...v, userIds });
    },
    onSuccess: (res: any) => {
      message.success(`已发送给 ${res?.receivers ?? 0} 人`);
      form.resetFields();
    },
  });

  return (
    <Card variant="borderless" style={{ maxWidth: 640 }}>
      <Form form={form} layout="vertical" onFinish={(v) => send.mutate(v)}>
        <Form.Item label="通道" name="channel" initialValue="INTERNAL"><Select options={CHANNELS} /></Form.Item>
        <Form.Item label="标题" name="title" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="内容" name="content" rules={[{ required: true }]}><Input.TextArea rows={4} /></Form.Item>
        <Form.Item label="目标用户ID(逗号分隔，留空=全员)" name="userIds"><Input placeholder="如 1,2,3" /></Form.Item>
        <Button type="primary" icon={<SendOutlined />} htmlType="submit" loading={send.isPending}>发送</Button>
      </Form>
    </Card>
  );
}

export default function MessagePage() {
  return (
    <Card variant="borderless">
      <Tabs
        items={[
          { key: 'tpl', label: '消息模板', children: <TemplatePanel /> },
          { key: 'send', label: '发送消息', children: <SendPanel /> },
        ]}
      />
    </Card>
  );
}
