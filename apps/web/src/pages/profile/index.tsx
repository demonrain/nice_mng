import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
  App as AntdApp,
} from 'antd';
import { useAuthStore } from '@/store/auth';
import { mfaApi, userApi } from '@/api/endpoints';

function MfaPanel() {
  const { message } = AntdApp.useApp();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ qrcode: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const loadStatus = async () => {
    const s = await mfaApi.status();
    setEnabled(s.enabled);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const onStartSetup = async () => {
    setLoading(true);
    try {
      const data = await mfaApi.setup();
      setSetup({ qrcode: data.qrcode, secret: data.secret });
    } finally {
      setLoading(false);
    }
  };

  const onEnable = async () => {
    setLoading(true);
    try {
      const { backupCodes: codes } = await mfaApi.enable(code.trim());
      setBackupCodes(codes);
      setSetup(null);
      setCode('');
      await loadStatus();
      message.success('二次验证已开启');
    } finally {
      setLoading(false);
    }
  };

  const onDisable = async () => {
    setLoading(true);
    try {
      await mfaApi.disable(code.trim());
      setCode('');
      await loadStatus();
      message.success('二次验证已关闭');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 460 }}>
      <Space style={{ marginBottom: 16 }}>
        <span>当前状态：</span>
        {enabled === null ? (
          <Tag>加载中</Tag>
        ) : enabled ? (
          <Tag color="green">已开启</Tag>
        ) : (
          <Tag color="default">未开启</Tag>
        )}
      </Space>

      {enabled === false && !setup && (
        <div>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="使用 Google Authenticator、Microsoft Authenticator 等 TOTP 应用扫码绑定。"
          />
          <Button type="primary" loading={loading} onClick={onStartSetup}>
            开启二次验证
          </Button>
        </div>
      )}

      {setup && (
        <div>
          <p>1. 用验证器 App 扫描下方二维码（或手动输入密钥）：</p>
          <img src={setup.qrcode} alt="MFA QRCode" style={{ width: 180, height: 180 }} />
          <p style={{ wordBreak: 'break-all' }}>
            密钥：<Typography.Text code copyable>{setup.secret}</Typography.Text>
          </p>
          <p style={{ marginTop: 12 }}>2. 输入 App 显示的 6 位验证码完成绑定：</p>
          <Space>
            <Input
              placeholder="6 位验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ width: 160 }}
            />
            <Button type="primary" loading={loading} onClick={onEnable}>
              确认开启
            </Button>
            <Button onClick={() => { setSetup(null); setCode(''); }}>取消</Button>
          </Space>
        </div>
      )}

      {enabled === true && (
        <div>
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="关闭二次验证会降低账号安全性。需输入当前验证码或备用码确认。"
          />
          <Space>
            <Input
              placeholder="验证码 / 备用码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ width: 180 }}
            />
            <Button danger loading={loading} onClick={onDisable}>
              关闭二次验证
            </Button>
          </Space>
        </div>
      )}

      <Modal
        open={!!backupCodes}
        title="请妥善保存备用码"
        onOk={() => setBackupCodes(null)}
        onCancel={() => setBackupCodes(null)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="我已保存"
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="每个备用码仅可使用一次，仅在此显示一次。当无法使用验证器时可用备用码登录。"
        />
        <Space wrap>
          {backupCodes?.map((c) => (
            <Typography.Text key={c} code copyable>
              {c}
            </Typography.Text>
          ))}
        </Space>
      </Modal>
    </div>
  );
}

export default function Profile() {
  const { message } = AntdApp.useApp();
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [infoForm] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const onUpdateInfo = async (values: Record<string, unknown>) => {
    await userApi.updateProfile(values);
    await fetchProfile();
    message.success('保存成功');
  };

  const onChangePwd = async (values: { oldPassword: string; newPassword: string }) => {
    await userApi.changePassword(values.oldPassword, values.newPassword);
    message.success('密码修改成功，请重新登录');
    pwdForm.resetFields();
  };

  return (
    <Row gutter={16}>
      <Col span={8}>
        <Card title="个人信息" variant="borderless">
          <Descriptions column={1}>
            <Descriptions.Item label="用户名">{profile?.username}</Descriptions.Item>
            <Descriptions.Item label="昵称">{profile?.nickname}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{profile?.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="手机">{profile?.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="部门">{profile?.deptName || '-'}</Descriptions.Item>
            <Descriptions.Item label="角色">{profile?.roles.join('、')}</Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>
      <Col span={16}>
        <Card variant="borderless">
          <Tabs
            items={[
              {
                key: 'info',
                label: '基本资料',
                children: (
                  <Form
                    form={infoForm}
                    layout="vertical"
                    initialValues={{
                      nickname: profile?.nickname,
                      email: profile?.email,
                      phone: profile?.phone,
                    }}
                    onFinish={onUpdateInfo}
                    style={{ maxWidth: 400 }}
                  >
                    <Form.Item label="昵称" name="nickname">
                      <Input />
                    </Form.Item>
                    <Form.Item label="邮箱" name="email">
                      <Input />
                    </Form.Item>
                    <Form.Item label="手机" name="phone">
                      <Input />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">
                      保存
                    </Button>
                  </Form>
                ),
              },
              {
                key: 'pwd',
                label: '修改密码',
                children: (
                  <Form form={pwdForm} layout="vertical" onFinish={onChangePwd} style={{ maxWidth: 400 }}>
                    <Form.Item label="原密码" name="oldPassword" rules={[{ required: true }]}>
                      <Input.Password />
                    </Form.Item>
                    <Form.Item
                      label="新密码"
                      name="newPassword"
                      extra="至少 8 位，需包含大小写字母与数字"
                      rules={[{ required: true, min: 8 }]}
                    >
                      <Input.Password />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">
                      修改
                    </Button>
                  </Form>
                ),
              },
              {
                key: 'mfa',
                label: '二次验证',
                children: <MfaPanel />,
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}
