import { useState } from 'react';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, App as AntdApp } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { i18nApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

const LANGS = [
  { label: '简体中文 (zh)', value: 'zh' },
  { label: 'English (en)', value: 'en' },
];

export default function I18nPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [lang, setLang] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['i18n', page, lang, keyword],
    queryFn: () => i18nApi.list({ page, pageSize: 10, lang, keyword }),
  });

  const save = useMutation({
    mutationFn: (v: any) => (editing ? i18nApi.update(editing.id, v) : i18nApi.create(v)),
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['i18n'] });
    },
  });

  const columns = [
    { title: '语言', dataIndex: 'lang', width: 100 },
    { title: '命名空间', dataIndex: 'namespace', width: 120 },
    { title: '键', dataIndex: 'key' },
    { title: '文案', dataIndex: 'value' },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="system:i18n:edit">
            <a
              onClick={() => {
                setEditing(record);
                form.setFieldsValue(record);
                setOpen(true);
              }}
            >
              编辑
            </a>
          </Access>
          <Access perm="system:i18n:delete">
            <Popconfirm
              title="确认删除?"
              onConfirm={async () => {
                await i18nApi.remove([record.id]);
                message.success('删除成功');
                qc.invalidateQueries({ queryKey: ['i18n'] });
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
      <Space style={{ marginBottom: 16 }} wrap>
        <Access perm="system:i18n:add">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpen(true);
            }}
          >
            新增词条
          </Button>
        </Access>
        <Select allowClear placeholder="按语言筛选" style={{ width: 160 }} options={LANGS} value={lang} onChange={setLang} />
        <Input.Search placeholder="搜索键/文案" allowClear onSearch={setKeyword} style={{ width: 220 }} />
      </Space>
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns as any}
        dataSource={data?.list}
        pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }}
      />

      <Modal open={open} title={editing ? '编辑词条' : '新增词条'} onOk={() => form.submit()} onCancel={() => setOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item label="语言" name="lang" rules={[{ required: true }]} initialValue="zh">
            <Select options={LANGS} />
          </Form.Item>
          <Form.Item label="命名空间" name="namespace" initialValue="translation">
            <Input />
          </Form.Item>
          <Form.Item label="键(支持点号分层 如 common.search)" name="key" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="文案" name="value" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
