import { useState } from 'react';
import { Button, Card, Popconfirm, Space, Table, Upload, App as AntdApp } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fileApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/auth';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FilePage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({ queryKey: ['files', page], queryFn: () => fileApi.list({ page, pageSize: 10 }) });

  const columns = [
    { title: '原始名', dataIndex: 'originalName' },
    { title: '类型', dataIndex: 'mimetype' },
    { title: '大小', dataIndex: 'size', render: (v: number) => formatSize(v) },
    { title: '地址', dataIndex: 'url', render: (v: string) => <a href={v} target="_blank" rel="noreferrer">查看</a> },
    { title: '上传时间', dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Popconfirm title="确认删除?" onConfirm={async () => { await fileApi.remove([record.id]); message.success('删除成功'); qc.invalidateQueries({ queryKey: ['files'] }); }}>
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card variant="borderless">
      <Space style={{ marginBottom: 16 }}>
        <Upload
          name="file"
          action={fileApi.uploadUrl}
          headers={{ Authorization: `Bearer ${token}` }}
          showUploadList={false}
          onChange={(info) => {
            if (info.file.status === 'done') {
              message.success('上传成功');
              qc.invalidateQueries({ queryKey: ['files'] });
            } else if (info.file.status === 'error') {
              message.error('上传失败');
            }
          }}
        >
          <Button type="primary" icon={<UploadOutlined />}>上传文件</Button>
        </Upload>
      </Space>
      <Table rowKey="id" loading={isLoading} columns={columns as any} dataSource={data?.list} pagination={{ current: page, total: data?.total, pageSize: 10, onChange: setPage }} />
    </Card>
  );
}
