import { useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, App as AntdApp } from 'antd';
import { PlusOutlined, NotificationOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { noticeApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

export default function NoticePage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['notices', page], queryFn: () => noticeApi.list({ page, pageSize: 10 }) });

  const save = useMutation({
    mutationFn: (v: any) => (editing ? noticeApi.update(editing.id, v) : noticeApi.create(v)),
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['notices'] });
    },
  });

  const broadcast = async (record: any) => {
    await noticeApi.broadcast({ title: record.title, content: record.content, type: 'NOTICE' });
    message.success('已广播给所有在线用户');
  };

  const columns = [
    { title: '标题', dataIndex: 'title' },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color={v === 'ANNOUNCE' ? 'red' : 'blue'}>{v === 'ANNOUNCE' ? '公告' : '通知'}</Tag> },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="system:notice:edit">
            <a onClick={() => { setEditing(record); form.setFieldsValue(record); setOpen(true); }}>编辑</a>
          </Access>
          <Access perm="system:notice:add">
            <a onClick={() => broadcast(record)}><NotificationOutlined /> 广播</a>
          </Access>
          <Access perm="system:notice:delete">
            <Popconfirm title="确认删除?" onConfirm={async () => { await noticeApi.remove([record.id]); message.success('删除成功'); qc.invalidateQueries({ queryKey: ['notices'] }); }}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ];

  return (
    <Card variant="borderless">
      <Access perm="system:notice:add">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }} style={{ marginBottom: 16 }}>新增公告</Button>
      </Access>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.list} pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }} />

      <Modal open={open} title={editing ? '编辑公告' : '新增公告'} onOk={() => form.submit()} onCancel={() => setOpen(false)} destroyOnClose width={600}>
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item label="标题" name="title" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="类型" name="type" initialValue="NOTICE">
            <Select options={[{ label: '通知', value: 'NOTICE' }, { label: '公告', value: 'ANNOUNCE' }]} />
          </Form.Item>
          <Form.Item label="内容" name="content" rules={[{ required: true }]}><Input.TextArea rows={5} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
