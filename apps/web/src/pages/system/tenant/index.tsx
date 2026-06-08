import { useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag, DatePicker, App as AntdApp } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { tenantApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

export default function TenantPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['tenants', page], queryFn: () => tenantApi.list({ page, pageSize: 10 }) });

  const save = useMutation({
    mutationFn: (v: any) => {
      const payload = { ...v, expireAt: v.expireAt ? v.expireAt.toISOString() : undefined };
      return editing ? tenantApi.update(editing.id, payload) : tenantApi.create(payload);
    },
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  const columns = [
    { title: '租户名称', dataIndex: 'name' },
    { title: '标识', dataIndex: 'code' },
    { title: '联系人', dataIndex: 'contactName' },
    { title: '联系电话', dataIndex: 'contactPhone' },
    { title: '到期时间', dataIndex: 'expireAt', render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD') : '永久') },
    { title: '状态', dataIndex: 'status', render: (v: number) => <Tag color={v === 1 ? 'success' : 'error'}>{v === 1 ? '正常' : '停用'}</Tag> },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="system:tenant:edit">
            <a
              onClick={() => {
                setEditing(record);
                form.setFieldsValue({ ...record, expireAt: record.expireAt ? dayjs(record.expireAt) : undefined });
                setOpen(true);
              }}
            >
              编辑
            </a>
          </Access>
          <Access perm="system:tenant:delete">
            <Popconfirm
              title="确认删除?"
              onConfirm={async () => {
                await tenantApi.remove([record.id]);
                message.success('删除成功');
                qc.invalidateQueries({ queryKey: ['tenants'] });
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
      <Access perm="system:tenant:add">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setOpen(true);
          }}
          style={{ marginBottom: 16 }}
        >
          新增租户
        </Button>
      </Access>
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns as any}
        dataSource={data?.list}
        pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }}
      />

      <Modal open={open} title={editing ? '编辑租户' : '新增租户'} onOk={() => form.submit()} onCancel={() => setOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item label="租户名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="租户标识" name="code" rules={[{ required: true }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item label="联系人" name="contactName">
            <Input />
          </Form.Item>
          <Form.Item label="联系电话" name="contactPhone">
            <Input />
          </Form.Item>
          <Form.Item label="到期时间" name="expireAt">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
