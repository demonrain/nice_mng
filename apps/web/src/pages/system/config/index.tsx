import { useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag, App as AntdApp } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { configApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

export default function ConfigPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['configs', page], queryFn: () => configApi.list({ page, pageSize: 10 }) });

  const save = useMutation({
    mutationFn: (v: any) => (editing ? configApi.update(editing.id, v) : configApi.create(v)),
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['configs'] });
    },
  });

  const columns = [
    { title: '参数名称', dataIndex: 'name' },
    { title: '键名', dataIndex: 'key', render: (v: string) => <Tag>{v}</Tag> },
    { title: '键值', dataIndex: 'value' },
    { title: '内置', dataIndex: 'builtin', render: (v: boolean) => (v ? <Tag color="gold">是</Tag> : '否') },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="system:config:edit">
            <a onClick={() => { setEditing(record); form.setFieldsValue(record); setOpen(true); }}>编辑</a>
          </Access>
          {!record.builtin && (
            <Access perm="system:config:delete">
              <Popconfirm title="确认删除?" onConfirm={async () => { await configApi.remove([record.id]); message.success('删除成功'); qc.invalidateQueries({ queryKey: ['configs'] }); }}>
                <a style={{ color: '#ff4d4f' }}>删除</a>
              </Popconfirm>
            </Access>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card variant="borderless">
      <Access perm="system:config:add">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }} style={{ marginBottom: 16 }}>新增参数</Button>
      </Access>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.list} pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }} />

      <Modal open={open} title={editing ? '编辑参数' : '新增参数'} onOk={() => form.submit()} onCancel={() => setOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item label="参数名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="键名" name="key" rules={[{ required: true }]}><Input disabled={!!editing} /></Form.Item>
          <Form.Item label="键值" name="value" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="备注" name="remark"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
