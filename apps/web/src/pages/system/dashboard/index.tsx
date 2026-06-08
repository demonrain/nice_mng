import { useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, App as AntdApp } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

const LAYOUT_HINT =
  '组件卡片 JSON 数组，例：[{"type":"stat","title":"用户数","value":128,"span":6},{"type":"line","title":"趋势","span":12,"x":["一","二","三"],"series":[10,20,15]}]';

export default function DashboardConfigPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['dash', page], queryFn: () => dashboardApi.list({ page, pageSize: 10 }) });

  const save = useMutation({
    mutationFn: (v: any) => {
      try {
        if (v.layout) JSON.parse(v.layout);
      } catch {
        throw new Error('布局 JSON 格式错误');
      }
      return editing ? dashboardApi.update(editing.id, v) : dashboardApi.create(v);
    },
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['dash'] });
    },
    onError: (e: any) => message.error(e.message || '保存失败'),
  });

  const columns = [
    { title: '名称', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code' },
    { title: '默认', dataIndex: 'isDefault', render: (v: boolean) => (v ? <Tag color="gold">默认</Tag> : '-') },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="system:dashboard:edit">
            <a onClick={() => { setEditing(record); form.setFieldsValue(record); setOpen(true); }}>编辑</a>
          </Access>
          <Access perm="system:dashboard:delete">
            <Popconfirm title="确认删除?" onConfirm={async () => { await dashboardApi.remove([record.id]); message.success('删除成功'); qc.invalidateQueries({ queryKey: ['dash'] }); }}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ];

  return (
    <Card variant="borderless">
      <Access perm="system:dashboard:add">
        <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>
          新增报表
        </Button>
      </Access>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.list} pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }} />

      <Modal open={open} title={editing ? '编辑报表' : '新增报表'} onOk={() => form.submit()} onCancel={() => setOpen(false)} destroyOnClose width={680}>
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="编码" name="code" rules={[{ required: true }]}><Input disabled={!!editing} /></Form.Item>
          <Form.Item label="设为默认" name="isDefault" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item label="布局配置" name="layout" extra={LAYOUT_HINT}><Input.TextArea rows={6} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
