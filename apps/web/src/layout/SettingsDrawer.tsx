import { Drawer, Divider, Switch, Radio, Space, Tooltip } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useAppStore } from '@/store/app';

const COLORS = ['#1677ff', '#722ed1', '#13c2c2', '#52c41a', '#fa8c16', '#f5222d', '#eb2f96'];

export default function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme, primaryColor, setPrimaryColor, layoutMode, setLayoutMode, compact, setCompact } =
    useAppStore();

  return (
    <Drawer title="系统设置" open={open} onClose={onClose} width={300}>
      <Divider orientation="left" plain>
        主题风格
      </Divider>
      <Space>
        <span>暗黑模式</span>
        <Switch checked={theme === 'dark'} onChange={(c) => setTheme(c ? 'dark' : 'light')} />
      </Space>

      <Divider orientation="left" plain>
        主题色
      </Divider>
      <Space wrap>
        {COLORS.map((c) => (
          <Tooltip title={c} key={c}>
            <div
              onClick={() => setPrimaryColor(c)}
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                background: c,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              {primaryColor === c && <CheckOutlined />}
            </div>
          </Tooltip>
        ))}
      </Space>

      <Divider orientation="left" plain>
        导航布局
      </Divider>
      <Radio.Group value={layoutMode} onChange={(e) => setLayoutMode(e.target.value)}>
        <Radio.Button value="side">侧边</Radio.Button>
        <Radio.Button value="top">顶部</Radio.Button>
        <Radio.Button value="mix">混合</Radio.Button>
      </Radio.Group>

      <Divider orientation="left" plain>
        界面密度
      </Divider>
      <Space>
        <span>紧凑模式</span>
        <Switch checked={compact} onChange={setCompact} />
      </Space>
    </Drawer>
  );
}
