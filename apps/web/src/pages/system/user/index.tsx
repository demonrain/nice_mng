import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  TreeSelect,
  App as AntdApp,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deptApi, roleApi, userApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

export default function UserPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['users', keyword, page],
    queryFn: () => userApi.list({ keyword, page, pageSize: 10 }),
  });
  const { data: roles } = useQuery({ queryKey: ['roles-all'], queryFn: () => roleApi.list({ pageSize: 200 }) });
  const { data: deptTree } = useQuery({ queryKey: ['dept-tree'], queryFn: () => deptApi.tree() });

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editing ? userApi.update(editing.id, values) : userApi.create(values),
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const openModal = (record?: any) => {
    setEditing(record || null);
    form.resetFields();
    if (record) form.setFieldsValue(record);
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    await userApi.remove([id]);
    message.success('删除成功');
    qc.invalidateQueries({ queryKey: ['users'] });
  };

  const handleResetPwd = (record: any) => {
    let pwd = '';
    Modal.confirm({
      title: `重置「${record.username}」的密码`,
      content: <Input.Password placeholder="请输入新密码" onChange={(e) => (pwd = e.target.value)} />,
      onOk: async () => {
        if (!pwd) return message.error('请输入新密码');
        await userApi.resetPwd(record.id, pwd);
        message.success('重置成功');
      },
    });
  };

  const toTreeData = (nodes: any[]): any[] =>
    (nodes || []).map((n) => ({ title: n.name, value: n.id, children: n.children ? toTreeData(n.children) : [] }));

  const columns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '昵称', dataIndex: 'nickname' },
    { title: '部门', dataIndex: ['dept', 'name'], render: (v: string) => v || '-' },
    { title: '手机', dataIndex: 'phone', render: (v: string) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: number) => <Tag color={v === 1 ? 'success' : 'error'}>{v === 1 ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="system:user:edit">
            <a onClick={() => openModal(record)}>编辑</a>
          </Access>
          <Access perm="system:user:resetPwd">
            <a onClick={() => handleResetPwd(record)}>重置密码</a>
          </Access>
          <Access perm="system:user:delete">
            <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ];

  return (
    <Card variant="borderless">
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="用户名/昵称/手机"
          allowClear
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          prefix={<SearchOutlined />}
        />
        <Button type="primary" onClick={() => setPage(1)}>
          搜索
        </Button>
        <Access perm="system:user:add">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            新增
          </Button>
        </Access>
      </Space>
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns as any}
        dataSource={data?.list}
        pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }}
      />

      <Modal
        open={open}
        title={editing ? '编辑用户' : '新增用户'}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          {!editing && (
            <Form.Item label="密码" name="password" rules={[{ required: true, min: 4 }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item label="昵称" name="nickname">
            <Input />
          </Form.Item>
          <Form.Item label="部门" name="deptId">
            <TreeSelect treeData={toTreeData(deptTree || [])} allowClear placeholder="选择部门" />
          </Form.Item>
          <Form.Item label="角色" name="roleIds">
            <Select
              mode="multiple"
              placeholder="选择角色"
              options={(roles?.list || []).map((r: any) => ({ label: r.name, value: r.id }))}
            />
          </Form.Item>
          <Form.Item label="手机" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue={1}>
            <Select
              options={[
                { label: '启用', value: 1 },
                { label: '停用', value: 0 },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
