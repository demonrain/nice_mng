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
  Tree,
  App as AntdApp,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { menuApi, roleApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

const DATA_SCOPES = [
  { label: '全部数据', value: 'ALL' },
  { label: '本部门及以下', value: 'DEPT_AND_CHILD' },
  { label: '本部门', value: 'DEPT' },
  { label: '仅本人', value: 'SELF' },
  { label: '自定义', value: 'CUSTOM' },
];

function toTree(nodes: any[]): any[] {
  return (nodes || []).map((n) => ({
    title: n.title,
    key: n.id,
    children: n.children ? toTree(n.children) : [],
  }));
}

export default function RolePage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [checkedMenus, setCheckedMenus] = useState<number[]>([]);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['roles', page], queryFn: () => roleApi.list({ page, pageSize: 10 }) });
  const { data: menuTree } = useQuery({ queryKey: ['menu-tree'], queryFn: () => menuApi.tree() });

  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = { ...values, menuIds: checkedMenus };
      return editing ? roleApi.update(editing.id, payload) : roleApi.create(payload);
    },
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const openModal = async (record?: any) => {
    form.resetFields();
    if (record) {
      const detail = await roleApi.detail(record.id);
      setEditing(detail);
      form.setFieldsValue(detail);
      setCheckedMenus(detail.menuIds || []);
    } else {
      setEditing(null);
      setCheckedMenus([]);
    }
    setOpen(true);
  };

  const columns = [
    { title: '角色名', dataIndex: 'name' },
    { title: '标识', dataIndex: 'code', render: (v: string) => <Tag>{v}</Tag> },
    { title: '排序', dataIndex: 'sort' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: number) => <Tag color={v === 1 ? 'success' : 'error'}>{v === 1 ? '启用' : '停用'}</Tag>,
    },
    {
      title: '操作',
      render: (_: unknown, record: any) =>
        record.code === 'super_admin' ? (
          <Tag color="gold">内置</Tag>
        ) : (
          <Space>
            <Access perm="system:role:edit">
              <a onClick={() => openModal(record)}>编辑</a>
            </Access>
            <Access perm="system:role:delete">
              <Popconfirm
                title="确认删除?"
                onConfirm={async () => {
                  await roleApi.remove([record.id]);
                  message.success('删除成功');
                  qc.invalidateQueries({ queryKey: ['roles'] });
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
      <Access perm="system:role:add">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ marginBottom: 16 }}>
          新增角色
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
        width={600}
        title={editing ? '编辑角色' : '新增角色'}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          <Form.Item label="角色名" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="角色标识" name="code" rules={[{ required: true }]}>
            <Input disabled={!!editing} placeholder="如 editor" />
          </Form.Item>
          <Form.Item label="数据权限" name="dataScope" initialValue="ALL">
            <Select options={DATA_SCOPES} />
          </Form.Item>
          <Form.Item label="排序" name="sort" initialValue={0}>
            <Input type="number" />
          </Form.Item>
          <Form.Item label="菜单权限">
            <Tree
              checkable
              checkedKeys={checkedMenus}
              onCheck={(keys: any) => setCheckedMenus(keys.checked ?? keys)}
              checkStrictly
              treeData={toTree(menuTree || [])}
              height={300}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
