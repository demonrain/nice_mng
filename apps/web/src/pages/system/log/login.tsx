import { useState } from 'react';
import { Button, Card, Input, Space, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { logApi } from '@/api/endpoints';

export default function LoginLogPage() {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['login-log', keyword, page],
    queryFn: () => logApi.loginList({ keyword, page, pageSize: 10 }),
  });

  const columns = [
    { title: '用户名', dataIndex: 'username' },
    { title: 'IP', dataIndex: 'ip', render: (v: string) => v || '-' },
    { title: '浏览器', dataIndex: 'browser' },
    { title: '系统', dataIndex: 'os' },
    { title: '状态', dataIndex: 'status', render: (v: number) => <Tag color={v === 1 ? 'success' : 'error'}>{v === 1 ? '成功' : '失败'}</Tag> },
    { title: '消息', dataIndex: 'message' },
    { title: '时间', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
  ];

  return (
    <Card variant="borderless">
      <Space style={{ marginBottom: 16 }}>
        <Input placeholder="用户名" allowClear value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <Button type="primary" onClick={() => { setPage(1); refetch(); }}>搜索</Button>
      </Space>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.list} pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }} />
    </Card>
  );
}
