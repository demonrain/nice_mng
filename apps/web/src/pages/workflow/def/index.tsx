import { useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, App as AntdApp } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workflowApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

const NODE_HINT = '审批节点 JSON 数组，例：[{"key":"lead","name":"主管审批","assigneeId":1},{"key":"hr","name":"HR审批","assigneeId":2}]';

export default function WorkflowDefPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['wf-def', page], queryFn: () => workflowApi.listDef({ page, pageSize: 10 }) });

  const save = useMutation({
    mutationFn: (v: any) => {
      try {
        if (v.nodes) JSON.parse(v.nodes);
      } catch {
        throw new Error('节点 JSON 格式错误');
      }
      return editing ? workflowApi.updateDef(editing.id, v) : workflowApi.createDef(v);
    },
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['wf-def'] });
    },
    onError: (e: any) => message.error(e.message || '保存失败'),
  });

  const columns = [
    { title: '流程名称', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code' },
    { title: '分类', dataIndex: 'category' },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="workflow:def:edit">
            <a onClick={() => { setEditing(record); form.setFieldsValue(record); setOpen(true); }}>编辑</a>
          </Access>
          <Access perm="workflow:def:delete">
            <Popconfirm title="确认删除?" onConfirm={async () => { await workflowApi.removeDef([record.id]); message.success('删除成功'); qc.invalidateQueries({ queryKey: ['wf-def'] }); }}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ];

  return (
    <Card variant="borderless">
      <Access perm="workflow:def:add">
        <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>
          新增流程
        </Button>
      </Access>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.list} pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }} />

      <Modal open={open} title={editing ? '编辑流程' : '新增流程'} onOk={() => form.submit()} onCancel={() => setOpen(false)} destroyOnClose width={640}>
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item label="流程名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="流程编码" name="code" rules={[{ required: true }]}><Input disabled={!!editing} /></Form.Item>
          <Form.Item label="分类" name="category"><Input /></Form.Item>
          <Form.Item label="审批节点" name="nodes" extra={NODE_HINT}><Input.TextArea rows={5} /></Form.Item>
          <Form.Item label="备注" name="remark"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
