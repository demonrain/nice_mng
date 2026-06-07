import { Button, Card, Popconfirm, Table, App as AntdApp } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { monitorApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

export default function OnlinePage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['online-users'], queryFn: () => monitorApi.online(), refetchInterval: 5000 });

  const columns = [
    { title: '用户名', dataIndex: 'username' },
    { title: 'Socket', dataIndex: 'socketId', ellipsis: true },
    { title: 'IP', dataIndex: 'ip' },
    { title: '连接时间', dataIndex: 'connectedAt', render: (v: number) => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Access perm="monitor:online:forceLogout">
          <Popconfirm title="确认强制下线?" onConfirm={async () => { await monitorApi.forceLogout(record.socketId); message.success('已强退'); qc.invalidateQueries({ queryKey: ['online-users'] }); }}>
            <Button danger size="small">强退</Button>
          </Popconfirm>
        </Access>
      ),
    },
  ];

  return (
    <Card variant="borderless" title={`在线用户（${data?.length || 0}）`}>
      <Table rowKey="socketId" loading={isLoading} columns={columns as any} dataSource={data} pagination={false} />
    </Card>
  );
}
