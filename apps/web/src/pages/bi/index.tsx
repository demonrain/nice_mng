import { Card, Col, Empty, Row, Spin, Statistic } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/endpoints';

interface Widget {
  type: 'stat' | 'line' | 'bar' | 'pie';
  title: string;
  span?: number;
  value?: number;
  x?: string[];
  series?: number[];
  data?: { name: string; value: number }[];
}

function WidgetCard({ w }: { w: Widget }) {
  if (w.type === 'stat') {
    return (
      <Card variant="borderless">
        <Statistic title={w.title} value={w.value ?? 0} />
      </Card>
    );
  }
  let option: Record<string, unknown> = {};
  if (w.type === 'line' || w.type === 'bar') {
    option = {
      title: { text: w.title, textStyle: { fontSize: 14 } },
      tooltip: {},
      xAxis: { type: 'category', data: w.x ?? [] },
      yAxis: { type: 'value' },
      series: [{ type: w.type, data: w.series ?? [], smooth: true }],
    };
  } else if (w.type === 'pie') {
    option = {
      title: { text: w.title, textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'item' },
      series: [{ type: 'pie', radius: '60%', data: w.data ?? [] }],
    };
  }
  return (
    <Card variant="borderless">
      <ReactECharts option={option} style={{ height: 300 }} />
    </Card>
  );
}

export default function BiPage() {
  const { data, isLoading } = useQuery({ queryKey: ['bi-default'], queryFn: () => dashboardApi.getDefault() });

  if (isLoading) return <Spin style={{ width: '100%', marginTop: 80 }} />;

  let widgets: Widget[] = [];
  try {
    widgets = data?.layout ? JSON.parse(data.layout) : [];
  } catch {
    widgets = [];
  }

  if (!widgets.length) {
    return (
      <Card variant="borderless">
        <Empty description="尚未配置报表，请在 系统管理 → 数据报表 中新增并设为默认" />
      </Card>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {widgets.map((w, i) => (
        <Col key={i} span={w.span ?? 8} xs={24} sm={12} md={w.span ?? 8}>
          <WidgetCard w={w} />
        </Col>
      ))}
    </Row>
  );
}
