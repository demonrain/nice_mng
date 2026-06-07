import { useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  App as AntdApp,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, CodeOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { genApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

const TS_TYPES = ['string', 'number', 'boolean', 'Date'];
const PRISMA_TYPES = ['String', 'Int', 'Boolean', 'DateTime', 'Float'];
const WIDGETS = ['input', 'textarea', 'number', 'select', 'switch', 'date'];

export default function GenPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['gen', page], queryFn: () => genApi.list({ page, pageSize: 10 }) });

  const save = useMutation({
    mutationFn: (values: any) => {
      const payload = { ...values, columns: JSON.stringify(values.columns || []) };
      return editing ? genApi.update(editing.id, payload) : genApi.create(payload);
    },
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['gen'] });
    },
  });

  const openModal = (record?: any) => {
    setEditing(record || null);
    form.resetFields();
    if (record) {
      form.setFieldsValue({ ...record, columns: JSON.parse(record.columns || '[]') });
    } else {
      form.setFieldsValue({
        columns: [{ name: 'name', comment: '名称', tsType: 'string', prismaType: 'String', widget: 'input', isRequired: true, isList: true, isQuery: true, isEdit: true }],
      });
    }
    setOpen(true);
  };

  const handlePreview = async (id: number) => {
    const files = await genApi.preview(id);
    setPreview(files);
  };

  const columns = [
    { title: '表名', dataIndex: 'tableName' },
    { title: '描述', dataIndex: 'tableComment' },
    { title: '实体类', dataIndex: 'className', render: (v: string) => <Tag>{v}</Tag> },
    { title: '模块/业务', render: (_: unknown, r: any) => `${r.moduleName}/${r.businessName}` },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="tool:gen:preview">
            <a onClick={() => handlePreview(record.id)}><CodeOutlined /> 预览代码</a>
          </Access>
          <Access perm="tool:gen:edit">
            <a onClick={() => openModal(record)}>编辑</a>
          </Access>
          <Access perm="tool:gen:delete">
            <Popconfirm title="确认删除?" onConfirm={async () => { await genApi.remove([record.id]); message.success('删除成功'); qc.invalidateQueries({ queryKey: ['gen'] }); }}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ];

  return (
    <Card variant="borderless">
      <Access perm="tool:gen:add">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ marginBottom: 16 }}>新增生成表</Button>
      </Access>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.list} pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }} />

      <Modal open={open} width={900} title={editing ? '编辑生成表' : '新增生成表'} onOk={() => form.submit()} onCancel={() => setOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Space wrap>
            <Form.Item label="表名" name="tableName" rules={[{ required: true }]}><Input placeholder="business_product" /></Form.Item>
            <Form.Item label="表描述" name="tableComment" rules={[{ required: true }]}><Input placeholder="商品表" /></Form.Item>
            <Form.Item label="实体类名" name="className" rules={[{ required: true }]}><Input placeholder="Product" /></Form.Item>
            <Form.Item label="模块名" name="moduleName" rules={[{ required: true }]}><Input placeholder="business" /></Form.Item>
            <Form.Item label="业务名" name="businessName" rules={[{ required: true }]}><Input placeholder="product" /></Form.Item>
            <Form.Item label="功能名" name="functionName" rules={[{ required: true }]}><Input placeholder="商品" /></Form.Item>
          </Space>

          <div style={{ fontWeight: 600, margin: '8px 0' }}>字段定义</div>
          <Form.List name="columns">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" wrap style={{ marginBottom: 8 }}>
                    <Form.Item {...field} name={[field.name, 'name']} rules={[{ required: true }]} noStyle>
                      <Input placeholder="字段名" style={{ width: 110 }} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'comment']} noStyle>
                      <Input placeholder="注释" style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'tsType']} noStyle>
                      <Select placeholder="TS类型" style={{ width: 100 }} options={TS_TYPES.map((t) => ({ label: t, value: t }))} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'prismaType']} noStyle>
                      <Select placeholder="Prisma" style={{ width: 100 }} options={PRISMA_TYPES.map((t) => ({ label: t, value: t }))} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'widget']} noStyle>
                      <Select placeholder="控件" style={{ width: 100 }} options={WIDGETS.map((t) => ({ label: t, value: t }))} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'isRequired']} valuePropName="checked" noStyle><Checkbox>必填</Checkbox></Form.Item>
                    <Form.Item {...field} name={[field.name, 'isList']} valuePropName="checked" noStyle><Checkbox>列表</Checkbox></Form.Item>
                    <Form.Item {...field} name={[field.name, 'isEdit']} valuePropName="checked" noStyle><Checkbox>表单</Checkbox></Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ tsType: 'string', prismaType: 'String', widget: 'input' })} block icon={<PlusOutlined />}>
                  添加字段
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal open={!!preview} width={1000} title="代码预览" footer={null} onCancel={() => setPreview(null)}>
        <Tabs
          items={(preview || []).map((f, i) => ({
            key: String(i),
            label: f.filename,
            children: (
              <div>
                <Button size="small" style={{ marginBottom: 8 }} onClick={() => { navigator.clipboard.writeText(f.content); message.success('已复制'); }}>复制代码</Button>
                <pre style={{ background: '#1e1e1e', color: '#d4d4d4', padding: 16, borderRadius: 6, maxHeight: 480, overflow: 'auto' }}>
                  <code>{f.content}</code>
                </pre>
              </div>
            ),
          }))}
        />
      </Modal>
    </Card>
  );
}
