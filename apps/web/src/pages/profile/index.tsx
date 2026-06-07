import { Button, Card, Col, Descriptions, Form, Input, Row, Tabs, App as AntdApp } from 'antd';
import { useAuthStore } from '@/store/auth';
import { userApi } from '@/api/endpoints';

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
                    <Form.Item label="新密码" name="newPassword" rules={[{ required: true, min: 4 }]}>
                      <Input.Password />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">
                      修改
                    </Button>
                  </Form>
                ),
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}
