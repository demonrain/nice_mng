import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  TreeSelect,
  App as AntdApp,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deptApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

export default function DeptPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data: tree, isLoading } = useQuery({ queryKey: ['dept-tree'], queryFn: () => deptApi.tree() });

  const saveMutation = useMutation({
    mutationFn: (values: any) => (editing ? deptApi.update(editing.id, values) : deptApi.create(values)),
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['dept-tree'] });
    },
  });

  const openModal = (record?: any, parentId?: number) => {
    setEditing(record || null);
    form.resetFields();
    if (record) form.setFieldsValue(record);
    else form.setFieldsValue({ parentId, status: 1 });
    setOpen(true);
  };

  const toTreeData = (nodes: any[]): any[] =>
    (nodes || []).map((n) => ({ title: n.name, value: n.id, children: n.children ? toTreeData(n.children) : [] }));

  const columns = [
    { title: '部门名称', dataIndex: 'name' },
    { title: '负责人', dataIndex: 'leader', render: (v: string) => v || '-' },
    { title: '电话', dataIndex: 'phone', render: (v: string) => v || '-' },
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
          <Access perm="system:dept:add">
            <a onClick={() => openModal(undefined, record.id)}>新增子部门</a>
          </Access>
          <Access perm="system:dept:edit">
            <a onClick={() => openModal(record)}>编辑</a>
          </Access>
          <Access perm="system:dept:delete">
            <Popconfirm
              title="确认删除?"
              onConfirm={async () => {
                await deptApi.remove(record.id);
                message.success('删除成功');
                qc.invalidateQueries({ queryKey: ['dept-tree'] });
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
      <Access perm="system:dept:add">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ marginBottom: 16 }}>
          新增部门
        </Button>
      </Access>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={tree} pagination={false} />

      <Modal
        open={open}
        title={editing ? '编辑部门' : '新增部门'}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          <Form.Item label="上级部门" name="parentId">
            <TreeSelect treeData={toTreeData(tree || [])} allowClear placeholder="顶级部门" />
          </Form.Item>
          <Form.Item label="部门名称" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="负责人" name="leader">
            <Input />
          </Form.Item>
          <Form.Item label="电话" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="排序" name="sort" initialValue={0}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
