import { useState } from 'react';
import { Button, Card, Input, Modal, Space, Table, Tag, App as AntdApp } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workflowApi } from '@/api/endpoints';

export default function WorkflowTodoPage() {
  const { message, modal } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [comment, setComment] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['wf-todo', page], queryFn: () => workflowApi.myTasks({ page, pageSize: 10 }) });

  const act = useMutation({
    mutationFn: ({ id, approve }: { id: number; approve: boolean }) => workflowApi.act(id, { approve, comment }),
    onSuccess: () => {
      message.success('处理成功');
      qc.invalidateQueries({ queryKey: ['wf-todo'] });
    },
  });

  const confirmAct = (record: any, approve: boolean) => {
    setComment('');
    modal.confirm({
      title: `${approve ? '通过' : '驳回'}：${record.instance?.title}`,
      content: <Input.TextArea placeholder="审批意见(可选)" onChange={(e) => setComment(e.target.value)} rows={3} />,
      onOk: () => act.mutateAsync({ id: record.id, approve }),
    });
  };

  const columns = [
    { title: '流程标题', dataIndex: ['instance', 'title'] },
    { title: '当前节点', dataIndex: 'nodeName' },
    { title: '状态', dataIndex: 'status', render: () => <Tag color="processing">待处理</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <a onClick={() => confirmAct(record, true)}>通过</a>
          <a style={{ color: '#ff4d4f' }} onClick={() => confirmAct(record, false)}>驳回</a>
        </Space>
      ),
    },
  ];

  return (
    <Card variant="borderless" title="我的待办">
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.list} pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }} />
    </Card>
  );
}
