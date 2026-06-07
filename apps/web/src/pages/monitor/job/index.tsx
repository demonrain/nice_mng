import { useState } from 'react';
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  App as AntdApp,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { jobApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

export default function JobPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [logsOpen, setLogsOpen] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['jobs', page], queryFn: () => jobApi.list({ page, pageSize: 10 }) });
  const { data: handlers } = useQuery({ queryKey: ['job-handlers'], queryFn: () => jobApi.handlers() });
  const { data: logs } = useQuery({
    queryKey: ['job-logs', logsOpen?.id],
    queryFn: () => jobApi.logs({ jobId: logsOpen.id, pageSize: 50 }),
    enabled: !!logsOpen,
  });

  const save = useMutation({
    mutationFn: (v: any) => (editing ? jobApi.update(editing.id, v) : jobApi.create(v)),
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const columns = [
    { title: '任务名', dataIndex: 'name' },
    { title: '处理器', dataIndex: 'invokeTarget', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'cron', dataIndex: 'cron', render: (v: string) => <code>{v}</code> },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: number, r: any) => (
        <Access perm="monitor:job:changeStatus" fallback={<Tag color={v === 1 ? 'success' : 'default'}>{v === 1 ? '运行中' : '暂停'}</Tag>}>
          <Switch
            checked={v === 1}
            checkedChildren="运行"
            unCheckedChildren="暂停"
            onChange={async (c) => { await jobApi.changeStatus(r.id, c ? 1 : 0); qc.invalidateQueries({ queryKey: ['jobs'] }); }}
          />
        </Access>
      ),
    },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="monitor:job:run">
            <a onClick={async () => { await jobApi.run(record.id); message.success('已触发执行'); }}>执行一次</a>
          </Access>
          <a onClick={() => setLogsOpen(record)}>日志</a>
          <Access perm="monitor:job:edit">
            <a onClick={() => { setEditing(record); form.setFieldsValue(record); setOpen(true); }}>编辑</a>
          </Access>
          <Access perm="monitor:job:delete">
            <Popconfirm title="确认删除?" onConfirm={async () => { await jobApi.remove([record.id]); message.success('删除成功'); qc.invalidateQueries({ queryKey: ['jobs'] }); }}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ];

  const logColumns = [
    { title: '状态', dataIndex: 'status', render: (v: number) => <Tag color={v === 1 ? 'success' : 'error'}>{v === 1 ? '成功' : '失败'}</Tag> },
    { title: '消息', dataIndex: 'message' },
    { title: '耗时', dataIndex: 'costMs', render: (v: number) => `${v}ms` },
    { title: '时间', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('MM-DD HH:mm:ss') },
  ];

  return (
    <Card variant="borderless">
      <Access perm="monitor:job:add">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }} style={{ marginBottom: 16 }}>新增任务</Button>
      </Access>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.list} pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }} />

      <Modal open={open} title={editing ? '编辑任务' : '新增任务'} onOk={() => form.submit()} onCancel={() => setOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)}>
          <Form.Item label="任务名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="处理器" name="invokeTarget" rules={[{ required: true }]}>
            <Select options={(handlers || []).map((h: string) => ({ label: h, value: h }))} placeholder="选择已注册的处理器" />
          </Form.Item>
          <Form.Item label="cron 表达式" name="cron" rules={[{ required: true }]}>
            <Input placeholder="如 0 */5 * * * * （每5分钟）" />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue={1}>
            <Select options={[{ label: '运行', value: 1 }, { label: '暂停', value: 0 }]} />
          </Form.Item>
          <Form.Item label="备注" name="remark"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>

      <Drawer title={`执行日志：${logsOpen?.name || ''}`} width={600} open={!!logsOpen} onClose={() => setLogsOpen(null)}>
        <Table rowKey="id" size="small" columns={logColumns as any} dataSource={logs?.list} pagination={false} />
      </Drawer>
    </Card>
  );
}
