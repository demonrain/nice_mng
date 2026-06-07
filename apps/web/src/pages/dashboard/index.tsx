import { Card, Col, Row, Statistic, List, Tag } from 'antd';
import { UserOutlined, TeamOutlined, FileTextOutlined, BellOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useQuery } from '@tanstack/react-query';
import { noticeApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/auth';

export default function Dashboard() {
  const profile = useAuthStore((s) => s.profile);
  const { data: notices } = useQuery({ queryKey: ['notice-recent'], queryFn: () => noticeApi.recent() });

  const lineOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
    yAxis: { type: 'value' },
    series: [
      { name: '访问量', type: 'line', smooth: true, areaStyle: {}, data: [820, 932, 901, 934, 1290, 1330, 1320] },
      { name: '注册量', type: 'line', smooth: true, data: [120, 132, 101, 134, 90, 230, 210] },
    ],
    legend: { data: ['访问量', '注册量'] },
  };

  const pieOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 1048, name: '系统管理' },
          { value: 735, name: '内容运营' },
          { value: 580, name: '数据分析' },
          { value: 484, name: '用户中心' },
        ],
      },
    ],
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }} variant="borderless">
        <h2 style={{ margin: 0 }}>👋 你好，{profile?.nickname || profile?.username}，欢迎回来！</h2>
        <p style={{ color: '#888', marginTop: 8, marginBottom: 0 }}>
          角色：{profile?.roles.join('、') || '-'} ｜ 部门：{profile?.deptName || '-'}
        </p>
      </Card>

      <Row gutter={16}>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic title="今日访问" value={11280} prefix={<UserOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic title="用户总数" value={3621} prefix={<TeamOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic title="操作日志" value={8945} prefix={<FileTextOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless">
            <Statistic title="待处理" value={42} prefix={<BellOutlined />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={16}>
          <Card title="访问趋势" variant="borderless">
            <ReactECharts option={lineOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="模块使用占比" variant="borderless">
            <ReactECharts option={pieOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="最新公告" variant="borderless">
            <List
              dataSource={notices || []}
              renderItem={(item: any) => (
                <List.Item>
                  <Tag color={item.type === 'ANNOUNCE' ? 'red' : 'blue'}>
                    {item.type === 'ANNOUNCE' ? '公告' : '通知'}
                  </Tag>
                  {item.title}
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
