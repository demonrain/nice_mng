import { Badge, Popover, List, Button, Empty, Tag } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { messageApi } from '@/api/endpoints';

interface Receipt {
  id: number;
  isRead: boolean;
  message: { title: string; content: string; type: string; createdAt: string };
}

export default function MessageBell() {
  const queryClient = useQueryClient();
  const { data: unread } = useQuery({
    queryKey: ['msg-unread'],
    queryFn: () => messageApi.unread(),
    refetchInterval: 30_000,
  });
  const { data: mine } = useQuery({
    queryKey: ['msg-mine'],
    queryFn: () => messageApi.mine({ page: 1, pageSize: 8 }),
  });

  const list = (mine?.list ?? []) as Receipt[];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['msg-unread'] });
    queryClient.invalidateQueries({ queryKey: ['msg-mine'] });
  };

  const onRead = async (id: number) => {
    await messageApi.read(id);
    refresh();
  };
  const onReadAll = async () => {
    await messageApi.readAll();
    refresh();
  };

  const content = (
    <div style={{ width: 320 }}>
      {list.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无消息" />
      ) : (
        <List
          size="small"
          dataSource={list}
          renderItem={(r) => (
            <List.Item
              style={{ cursor: 'pointer', opacity: r.isRead ? 0.55 : 1 }}
              onClick={() => !r.isRead && onRead(r.id)}
            >
              <List.Item.Meta
                title={
                  <span>
                    {!r.isRead && <Tag color="red">未读</Tag>}
                    {r.message.title}
                  </span>
                }
                description={<span style={{ fontSize: 12 }}>{r.message.content?.slice(0, 40)}</span>}
              />
            </List.Item>
          )}
        />
      )}
      <div style={{ textAlign: 'right', marginTop: 8 }}>
        <Button size="small" type="link" onClick={onReadAll}>
          全部已读
        </Button>
      </div>
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight" title="站内消息">
      <Badge count={unread?.count ?? 0} size="small">
        <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
      </Badge>
    </Popover>
  );
}
