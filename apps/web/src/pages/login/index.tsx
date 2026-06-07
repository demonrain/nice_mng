import { useEffect, useState } from 'react';
import { Button, Card, Checkbox, Form, Input, App as AntdApp } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, KeyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useMenuStore } from '@/store/menu';
import { authApi } from '@/api/endpoints';

export default function Login() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const login = useAuthStore((s) => s.login);
  const loginMfa = useAuthStore((s) => s.loginMfa);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const loadRoutes = useMenuStore((s) => s.loadRoutes);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState<{ id: string; svg: string } | null>(null);
  // MFA 二次验证步骤
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const refreshCaptcha = async () => {
    try {
      const data = await authApi.captcha();
      setCaptcha(data);
    } catch {
      setCaptcha(null);
    }
  };

  useEffect(() => {
    refreshCaptcha();
  }, []);

  const finishLogin = async () => {
    await fetchProfile();
    await loadRoutes();
    message.success('登录成功');
    navigate('/dashboard', { replace: true });
  };

  const onFinish = async (values: { username: string; password: string; captcha?: string }) => {
    setLoading(true);
    try {
      const result = await login({ ...values, captchaId: captcha?.id });
      if ('mfaRequired' in result && result.mfaRequired) {
        setMfaToken(result.mfaToken);
        message.info('请输入二次验证码');
        return;
      }
      await finishLogin();
    } catch {
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const onVerifyMfa = async () => {
    if (!mfaToken) return;
    setLoading(true);
    try {
      await loginMfa(mfaToken, mfaCode.trim());
      await finishLogin();
    } catch {
      // 错误已由拦截器提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1677ff 0%, #2f54eb 50%, #722ed1 100%)',
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, margin: 0, color: '#1677ff' }}>nice-admin</h1>
          <p style={{ color: '#888', marginTop: 8 }}>企业级后台管理系统</p>
        </div>

        {!mfaToken ? (
          <Form
            initialValues={{ username: 'admin', password: 'admin123' }}
            onFinish={onFinish}
            size="large"
          >
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="用户名" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            {captcha && (
              <Form.Item name="captcha" rules={[{ required: true, message: '请输入验证码' }]}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input prefix={<SafetyOutlined />} placeholder="验证码" />
                  <div
                    style={{ cursor: 'pointer', height: 40, width: 120, border: '1px solid #eee', borderRadius: 6, overflow: 'hidden' }}
                    onClick={refreshCaptcha}
                    title="点击刷新"
                    dangerouslySetInnerHTML={{ __html: captcha.svg }}
                  />
                </div>
              </Form.Item>
            )}
            <Form.Item>
              <Checkbox defaultChecked>记住我</Checkbox>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                登 录
              </Button>
            </Form.Item>
            <div style={{ color: '#aaa', fontSize: 12, textAlign: 'center' }}>
              默认账号 admin / admin123
            </div>
          </Form>
        ) : (
          <div>
            <p style={{ color: '#666', marginBottom: 16 }}>
              该账号已开启二次验证，请输入验证器中的 6 位验证码或一个备用码。
            </p>
            <Input
              size="large"
              prefix={<KeyOutlined />}
              placeholder="验证码 / 备用码"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              onPressEnter={onVerifyMfa}
              autoFocus
            />
            <Button
              type="primary"
              block
              size="large"
              loading={loading}
              style={{ marginTop: 16 }}
              onClick={onVerifyMfa}
            >
              验 证
            </Button>
            <Button
              type="link"
              block
              style={{ marginTop: 8 }}
              onClick={() => {
                setMfaToken(null);
                setMfaCode('');
                refreshCaptcha();
              }}
            >
              返回重新登录
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
