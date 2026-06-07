import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Table,
  Tag,
  TreeSelect,
  App as AntdApp,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { menuApi } from '@/api/endpoints';
import { Access } from '@/components/Access';
import { renderIcon } from '@/utils/icon';

const TYPE_LABEL: Record<string, { text: string; color: string }> = {
  DIR: { text: '目录', color: 'blue' },
  MENU: { text: '菜单', color: 'green' },
  BUTTON: { text: '按钮', color: 'orange' },
};

export default function MenuPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const type = Form.useWatch('type', form);

  const { data: tree, isLoading } = useQuery({ queryKey: ['menu-tree'], queryFn: () => menuApi.tree() });

  const saveMutation = useMutation({
    mutationFn: (values: any) => (editing ? menuApi.update(editing.id, values) : menuApi.create(values)),
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['menu-tree'] });
    },
  });

  const openModal = (record?: any, parentId?: number) => {
    setEditing(record || null);
    form.resetFields();
    if (record) form.setFieldsValue(record);
    else form.setFieldsValue({ type: 'MENU', parentId, visible: true });
    setOpen(true);
  };

  const toTreeData = (nodes: any[]): any[] =>
    (nodes || []).map((n) => ({ title: n.title, value: n.id, children: n.children ? toTreeData(n.children) : [] }));

  const columns = [
    { title: '名称', dataIndex: 'title', render: (v: string, r: any) => <Space>{renderIcon(r.icon)}{v}</Space> },
    { title: '类型', dataIndex: 'type', width: 80, render: (v: string) => <Tag color={TYPE_LABEL[v]?.color}>{TYPE_LABEL[v]?.text}</Tag> },
    { title: '路由', dataIndex: 'path' },
    { title: '组件', dataIndex: 'component' },
    { title: '权限标识', dataIndex: 'perm', render: (v: string) => v && <Tag>{v}</Tag> },
    { title: '排序', dataIndex: 'sort', width: 70 },
    {
      title: '操作',
      width: 180,
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="system:menu:add">
            <a onClick={() => openModal(undefined, record.id)}>新增子项</a>
          </Access>
          <Access perm="system:menu:edit">
            <a onClick={() => openModal(record)}>编辑</a>
          </Access>
          <Access perm="system:menu:delete">
            <Popconfirm
              title="确认删除?"
              onConfirm={async () => {
                await menuApi.remove(record.id);
                message.success('删除成功');
                qc.invalidateQueries({ queryKey: ['menu-tree'] });
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
      <Access perm="system:menu:add">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ marginBottom: 16 }}>
          新增菜单
        </Button>
      </Access>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={tree} pagination={false} />

      <Modal
        open={open}
        width={600}
        title={editing ? '编辑菜单' : '新增菜单'}
        onOk={() => form.submit()}
        onCancel={() => setOpen(false)}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          <Form.Item label="上级菜单" name="parentId">
            <TreeSelect treeData={toTreeData(tree || [])} allowClear placeholder="顶级菜单" />
          </Form.Item>
          <Form.Item label="类型" name="type" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="DIR">目录</Radio.Button>
              <Radio.Button value="MENU">菜单</Radio.Button>
              <Radio.Button value="BUTTON">按钮</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="路由 name，唯一" />
          </Form.Item>
          <Form.Item label="标题" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {type !== 'BUTTON' && (
            <>
              <Form.Item label="路由路径" name="path">
                <Input placeholder="/system/user" />
              </Form.Item>
              <Form.Item label="图标" name="icon">
                <Input placeholder="如 UserOutlined" />
              </Form.Item>
            </>
          )}
          {type === 'MENU' && (
            <Form.Item label="组件路径" name="component">
              <Input placeholder="system/user/index" />
            </Form.Item>
          )}
          {type !== 'DIR' && (
            <Form.Item label="权限标识" name="perm">
              <Input placeholder="system:user:list" />
            </Form.Item>
          )}
          <Form.Item label="排序" name="sort" initialValue={0}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
