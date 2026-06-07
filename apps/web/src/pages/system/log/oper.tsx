import { useState } from 'react';
import { Button, Card, Drawer, Descriptions, Input, Space, Table, Tag, App as AntdApp } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { logApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

export default function OperLogPage() {
  const { message } = AntdApp.useApp();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['oper-log', keyword, page],
    queryFn: () => logApi.operList({ keyword, page, pageSize: 10 }),
  });

  const columns = [
    { title: '模块', dataIndex: 'title' },
    { title: '类型', dataIndex: 'businessType', render: (v: string) => <Tag>{v}</Tag> },
    { title: '操作人', dataIndex: 'operName', render: (v: string) => v || '-' },
    { title: '请求方式', dataIndex: 'requestMethod' },
    { title: 'IP', dataIndex: 'ip', render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'status', render: (v: number) => <Tag color={v === 1 ? 'success' : 'error'}>{v === 1 ? '成功' : '失败'}</Tag> },
    { title: '耗时', dataIndex: 'costMs', render: (v: number) => `${v}ms` },
    { title: '时间', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss') },
    { title: '操作', render: (_: unknown, r: any) => <a onClick={() => setDetail(r)}>详情</a> },
  ];

  return (
    <Card variant="borderless">
      <Space style={{ marginBottom: 16 }}>
        <Input placeholder="模块/操作人" allowClear value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <Button type="primary" onClick={() => { setPage(1); refetch(); }}>搜索</Button>
      </Space>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.list} pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }} />

      <Drawer title="操作日志详情" width={520} open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="模块">{detail.title}</Descriptions.Item>
            <Descriptions.Item label="方法">{detail.method}</Descriptions.Item>
            <Descriptions.Item label="URL">{detail.url}</Descriptions.Item>
            <Descriptions.Item label="参数"><pre style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{detail.params}</pre></Descriptions.Item>
            <Descriptions.Item label="返回"><pre style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{detail.result}</pre></Descriptions.Item>
            {detail.errorMsg && <Descriptions.Item label="错误">{detail.errorMsg}</Descriptions.Item>}
          </Descriptions>
        )}
      </Drawer>
    </Card>
  );
}
