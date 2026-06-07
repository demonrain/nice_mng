import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  App as AntdApp,
} from 'antd';
import { PlusOutlined, ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined, AppstoreAddOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormField } from '@nice-admin/shared';
import { formApi } from '@/api/endpoints';
import { Access } from '@/components/Access';
import FormRenderer from '@/components/FormRenderer';

const WIDGET_PALETTE = [
  { widget: 'input', label: '单行文本' },
  { widget: 'textarea', label: '多行文本' },
  { widget: 'number', label: '数字' },
  { widget: 'select', label: '下拉选择' },
  { widget: 'radio', label: '单选' },
  { widget: 'checkbox', label: '多选' },
  { widget: 'switch', label: '开关' },
  { widget: 'date', label: '日期' },
];

let fieldSeq = 1;

export default function FormDesignerPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [meta, setMeta] = useState({ name: '', code: '', title: '表单' });
  const [fields, setFields] = useState<FormField[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['forms', page], queryFn: () => formApi.list({ page, pageSize: 10 }) });

  const save = useMutation({
    mutationFn: () => {
      const schema = JSON.stringify({ title: meta.title, fields });
      const payload = { name: meta.name, code: meta.code, schema };
      return editing ? formApi.update(editing.id, payload) : formApi.create(payload);
    },
    onSuccess: () => {
      message.success('保存成功');
      setDesignerOpen(false);
      qc.invalidateQueries({ queryKey: ['forms'] });
    },
  });

  const openDesigner = async (record?: any) => {
    if (record) {
      const detail = await formApi.detail(record.id);
      const parsed = JSON.parse(detail.schema || '{}');
      setEditing(detail);
      setMeta({ name: detail.name, code: detail.code, title: parsed.title || '表单' });
      setFields(parsed.fields || []);
    } else {
      setEditing(null);
      setMeta({ name: '', code: '', title: '表单' });
      setFields([]);
    }
    setActiveKey(null);
    setDesignerOpen(true);
  };

  const addField = (widget: string) => {
    const key = `field_${fieldSeq++}`;
    const newField: FormField = {
      key,
      label: '新字段',
      widget,
      required: false,
      span: 24,
      options: ['select', 'radio', 'checkbox'].includes(widget)
        ? [{ label: '选项1', value: '1' }, { label: '选项2', value: '2' }]
        : undefined,
    };
    setFields((f) => [...f, newField]);
    setActiveKey(key);
  };

  const updateField = (key: string, patch: Partial<FormField>) => {
    setFields((f) => f.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const moveField = (index: number, dir: -1 | 1) => {
    setFields((f) => {
      const next = [...f];
      const target = index + dir;
      if (target < 0 || target >= next.length) return f;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const active = fields.find((f) => f.key === activeKey);

  const columns = [
    { title: '表单名', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code', render: (v: string) => <Tag>{v}</Tag> },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="tool:form:edit">
            <a onClick={() => openDesigner(record)}>设计</a>
          </Access>
          <Access perm="tool:form:delete">
            <Popconfirm title="确认删除?" onConfirm={async () => { await formApi.remove([record.id]); message.success('删除成功'); qc.invalidateQueries({ queryKey: ['forms'] }); }}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ];

  return (
    <Card variant="borderless">
      <Access perm="tool:form:add">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openDesigner()} style={{ marginBottom: 16 }}>新建表单</Button>
      </Access>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.list} pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }} />

      <Modal
        open={designerOpen}
        width={1100}
        title="表单设计器"
        okText="保存"
        onOk={() => {
          if (!meta.name || !meta.code) return message.error('请填写表单名与编码');
          save.mutate();
        }}
        onCancel={() => setDesignerOpen(false)}
        destroyOnClose
      >
        <Space style={{ marginBottom: 12 }} wrap>
          <Input addonBefore="表单名" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} style={{ width: 240 }} />
          <Input addonBefore="编码" value={meta.code} disabled={!!editing} onChange={(e) => setMeta({ ...meta, code: e.target.value })} style={{ width: 240 }} />
        </Space>
        <Row gutter={12}>
          <Col span={5}>
            <Card size="small" title={<span><AppstoreAddOutlined /> 组件</span>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {WIDGET_PALETTE.map((w) => (
                  <Button key={w.widget} block onClick={() => addField(w.widget)}>{w.label}</Button>
                ))}
              </Space>
            </Card>
          </Col>
          <Col span={11}>
            <Card size="small" title="画布（点击字段编辑）">
              {fields.length === 0 && <div style={{ color: '#aaa', textAlign: 'center', padding: 40 }}>从左侧添加组件</div>}
              {fields.map((f, i) => (
                <div
                  key={f.key}
                  onClick={() => setActiveKey(f.key)}
                  style={{
                    border: activeKey === f.key ? '1px solid #1677ff' : '1px dashed #ddd',
                    borderRadius: 6,
                    padding: 8,
                    marginBottom: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{f.label} <Tag>{f.widget}</Tag>{f.required && <Tag color="red">必填</Tag>}</span>
                  <Space>
                    <ArrowUpOutlined onClick={(e) => { e.stopPropagation(); moveField(i, -1); }} />
                    <ArrowDownOutlined onClick={(e) => { e.stopPropagation(); moveField(i, 1); }} />
                    <DeleteOutlined style={{ color: '#ff4d4f' }} onClick={(e) => { e.stopPropagation(); setFields((arr) => arr.filter((x) => x.key !== f.key)); }} />
                  </Space>
                </div>
              ))}
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="属性配置">
              {active ? (
                <Form layout="vertical">
                  <Form.Item label="标签"><Input value={active.label} onChange={(e) => updateField(active.key, { label: e.target.value })} /></Form.Item>
                  <Form.Item label="字段名(key)"><Input value={active.key} disabled /></Form.Item>
                  <Form.Item label="占位提示"><Input value={active.placeholder} onChange={(e) => updateField(active.key, { placeholder: e.target.value })} /></Form.Item>
                  <Form.Item label="栅格宽度">
                    <Select value={active.span} onChange={(v) => updateField(active.key, { span: v })} options={[{ label: '整行(24)', value: 24 }, { label: '一半(12)', value: 12 }, { label: '三分之一(8)', value: 8 }]} />
                  </Form.Item>
                  <Form.Item label="是否必填">
                    <Select value={active.required ? 1 : 0} onChange={(v) => updateField(active.key, { required: !!v })} options={[{ label: '否', value: 0 }, { label: '是', value: 1 }]} />
                  </Form.Item>
                  {['select', 'radio', 'checkbox'].includes(active.widget) && (
                    <Form.Item label="选项(label:value 每行一个)">
                      <Input.TextArea
                        rows={4}
                        value={(active.options || []).map((o) => `${o.label}:${o.value}`).join('\n')}
                        onChange={(e) =>
                          updateField(active.key, {
                            options: e.target.value.split('\n').filter(Boolean).map((line) => {
                              const [label, value] = line.split(':');
                              return { label, value: value ?? label };
                            }),
                          })
                        }
                      />
                    </Form.Item>
                  )}
                </Form>
              ) : (
                <div style={{ color: '#aaa' }}>选择一个字段进行配置</div>
              )}
            </Card>
          </Col>
        </Row>
        <Divider>实时预览</Divider>
        <Card size="small">
          <FormRenderer schema={{ title: meta.title, fields }} />
        </Card>
      </Modal>
    </Card>
  );
}
