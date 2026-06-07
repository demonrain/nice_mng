import { useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Tag, App as AntdApp } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { postApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

export default function PostPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['posts', page], queryFn: () => postApi.list({ page, pageSize: 10 }) });

  const saveMutation = useMutation({
    mutationFn: (values: any) => (editing ? postApi.update(editing.id, values) : postApi.create(values)),
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const openModal = (record?: any) => {
    setEditing(record || null);
    form.resetFields();
    if (record) form.setFieldsValue(record);
    setOpen(true);
  };

  const columns = [
    { title: '岗位名称', dataIndex: 'name' },
    { title: '标识', dataIndex: 'code', render: (v: string) => <Tag>{v}</Tag> },
    { title: '排序', dataIndex: 'sort' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: number) => <Tag color={v === 1 ? 'success' : 'error'}>{v === 1 ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="system:post:edit">
            <a onClick={() => openModal(record)}>编辑</a>
          </Access>
          <Access perm="system:post:delete">
            <Popconfirm
              title="确认删除?"
              onConfirm={async () => {
                await postApi.remove([record.id]);
                message.success('删除成功');
                qc.invalidateQueries({ queryKey: ['posts'] });
              }}
            >
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ];

  return (
    <Card variant="borderless">
      <Access perm="system:post:add">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ marginBottom: 16 }}>
          新增岗位
        </Button>
      </Access>
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns as any}
        dataSource={data?.list}
        pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }}
      />

      <Modal
        open={open}
        title={editing ? '编辑岗位' : '新增岗位'}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          <Form.Item label="岗位名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="岗位标识" name="code" rules={[{ required: true }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item label="排序" name="sort" initialValue={0}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
