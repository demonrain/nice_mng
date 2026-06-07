import { Card, Col, Descriptions, Progress, Row, Statistic } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { monitorApi } from '@/api/endpoints';

function gb(bytes: number) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

export default function ServerMonitorPage() {
  const { data: server } = useQuery({ queryKey: ['monitor-server'], queryFn: () => monitorApi.server(), refetchInterval: 5000 });
  const { data: cache } = useQuery({ queryKey: ['monitor-cache'], queryFn: () => monitorApi.cache(), refetchInterval: 5000 });

  return (
    <div>
      <Row gutter={16}>
        <Col span={8}>
          <Card title="CPU" variant="borderless">
            <Progress type="dashboard" percent={server?.cpu.usage || 0} />
            <Statistic title="核心数" value={server?.cpu.cores || 0} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="内存" variant="borderless">
            <Progress type="dashboard" percent={server?.memory.usage || 0} status="active" />
            <div style={{ color: '#888' }}>
              {server ? `${gb(server.memory.used)} / ${gb(server.memory.total)}` : '-'}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="磁盘" variant="borderless">
            <Progress type="dashboard" percent={server?.disk.usage || 0} strokeColor="#faad14" />
            <div style={{ color: '#888' }}>
              {server ? `${gb(server.disk.used)} / ${gb(server.disk.total)}` : '-'}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="Node 进程" variant="borderless">
            <Descriptions column={1}>
              <Descriptions.Item label="Node 版本">{server?.node.version}</Descriptions.Item>
              <Descriptions.Item label="PID">{server?.node.pid}</Descriptions.Item>
              <Descriptions.Item label="系统运行时间">{server ? `${Math.floor(server.uptime / 3600)} 小时` : '-'}</Descriptions.Item>
              <Descriptions.Item label="负载">{server?.loadavg?.map((n: number) => n.toFixed(2)).join(' / ')}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Redis 缓存" variant="borderless">
            <Descriptions column={1}>
              <Descriptions.Item label="版本">{cache?.version}</Descriptions.Item>
              <Descriptions.Item label="Key 数量">{cache?.dbSize}</Descriptions.Item>
              <Descriptions.Item label="内存占用">{cache?.memoryUsed}</Descriptions.Item>
              <Descriptions.Item label="连接客户端">{cache?.connectedClients}</Descriptions.Item>
              <Descriptions.Item label="命中率">{cache?.hitRate}%</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
