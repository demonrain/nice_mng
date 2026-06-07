import { Form, Input, InputNumber, Select, Switch, DatePicker, Radio, Checkbox, Col, Row } from 'antd';
import type { FormField, FormSchemaDefinition } from '@nice-admin/shared';

function renderWidget(field: FormField) {
  switch (field.widget) {
    case 'textarea':
      return <Input.TextArea placeholder={field.placeholder} rows={3} />;
    case 'number':
      return <InputNumber style={{ width: '100%' }} placeholder={field.placeholder} />;
    case 'select':
      return <Select placeholder={field.placeholder} options={field.options} allowClear />;
    case 'radio':
      return <Radio.Group options={field.options} />;
    case 'checkbox':
      return <Checkbox.Group options={field.options} />;
    case 'switch':
      return <Switch />;
    case 'date':
      return <DatePicker style={{ width: '100%' }} />;
    default:
      return <Input placeholder={field.placeholder} />;
  }
}

interface Props {
  schema: FormSchemaDefinition;
  onFinish?: (values: Record<string, unknown>) => void;
}

/** 根据 schema 渲染表单（低代码运行时） */
export default function FormRenderer({ schema, onFinish }: Props) {
  return (
    <Form layout="vertical" onFinish={onFinish}>
      <Row gutter={16}>
        {schema.fields.map((field) => (
          <Col span={field.span || 24} key={field.key}>
            <Form.Item
              label={field.label}
              name={field.key}
              valuePropName={field.widget === 'switch' ? 'checked' : 'value'}
              rules={field.required ? [{ required: true, message: `请填写${field.label}` }] : []}
            >
              {renderWidget(field)}
            </Form.Item>
          </Col>
        ))}
      </Row>
    </Form>
  );
}
