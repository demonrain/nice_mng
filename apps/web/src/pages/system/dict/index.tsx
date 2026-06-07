import { useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Space, Table, Tag, App as AntdApp } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dictApi } from '@/api/endpoints';
import { Access } from '@/components/Access';

export default function DictPage() {
  const { message } = AntdApp.useApp();
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState<any>(null);
  const [typeModal, setTypeModal] = useState(false);
  const [dataModal, setDataModal] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [editingData, setEditingData] = useState<any>(null);
  const [typeForm] = Form.useForm();
  const [dataForm] = Form.useForm();

  const { data: types, isLoading } = useQuery({ queryKey: ['dict-types'], queryFn: () => dictApi.listType({ pageSize: 100 }) });
  const { data: dataList } = useQuery({
    queryKey: ['dict-data', selectedType?.id],
    queryFn: () => dictApi.listData(selectedType.id),
    enabled: !!selectedType,
  });

  const saveType = useMutation({
    mutationFn: (v: any) => (editingType ? dictApi.updateType(editingType.id, v) : dictApi.createType(v)),
    onSuccess: () => {
      message.success('保存成功');
      setTypeModal(false);
      qc.invalidateQueries({ queryKey: ['dict-types'] });
    },
  });
  const saveData = useMutation({
    mutationFn: (v: any) =>
      editingData ? dictApi.updateData(editingData.id, v) : dictApi.createData({ ...v, dictTypeId: selectedType.id }),
    onSuccess: () => {
      message.success('保存成功');
      setDataModal(false);
      qc.invalidateQueries({ queryKey: ['dict-data', selectedType?.id] });
    },
  });

  const typeColumns = [
    { title: '名称', dataIndex: 'name' },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag>{v}</Tag> },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="system:dict:edit">
            <a onClick={(e) => { e.stopPropagation(); setEditingType(record); typeForm.setFieldsValue(record); setTypeModal(true); }}>编辑</a>
          </Access>
          <Access perm="system:dict:delete">
            <Popconfirm title="确认删除?" onConfirm={async () => { await dictApi.removeType([record.id]); message.success('删除成功'); qc.invalidateQueries({ queryKey: ['dict-types'] }); }}>
              <a style={{ color: '#ff4d4f' }} onClick={(e) => e.stopPropagation()}>删除</a>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ];

  const dataColumns = [
    { title: '标签', dataIndex: 'label', render: (v: string, r: any) => <Tag color={r.tagType || 'default'}>{v}</Tag> },
    { title: '键值', dataIndex: 'value' },
    { title: '排序', dataIndex: 'sort' },
    {
      title: '操作',
      render: (_: unknown, record: any) => (
        <Space>
          <Access perm="system:dict:edit">
            <a onClick={() => { setEditingData(record); dataForm.setFieldsValue(record); setDataModal(true); }}>编辑</a>
          </Access>
          <Access perm="system:dict:delete">
            <Popconfirm title="确认删除?" onConfirm={async () => { await dictApi.removeData([record.id]); message.success('删除成功'); qc.invalidateQueries({ queryKey: ['dict-data', selectedType?.id] }); }}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Access>
        </Space>
      ),
    },
  ];

  return (
    <Row gutter={16}>
      <Col span={10}>
        <Card title="字典类型" variant="borderless" extra={
          <Access perm="system:dict:add">
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { setEditingType(null); typeForm.resetFields(); setTypeModal(true); }}>新增</Button>
          </Access>
        }>
          <Table
            rowKey="id"
            size="small"
            loading={isLoading}
            columns={typeColumns as any}
            dataSource={types?.list}
            pagination={false}
            onRow={(record) => ({ onClick: () => setSelectedType(record), style: { cursor: 'pointer', background: selectedType?.id === record.id ? '#e6f4ff' : undefined } })}
          />
        </Card>
      </Col>
      <Col span={14}>
        <Card title={selectedType ? `字典数据：${selectedType.name}` : '字典数据（请选择左侧类型）'} variant="borderless" extra={
          selectedType && (
            <Access perm="system:dict:add">
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { setEditingData(null); dataForm.resetFields(); setDataModal(true); }}>新增</Button>
            </Access>
          )
        }>
          <Table rowKey="id" size="small" columns={dataColumns as any} dataSource={dataList} pagination={false} />
        </Card>
      </Col>

      <Modal open={typeModal} title={editingType ? '编辑字典类型' : '新增字典类型'} onOk={() => typeForm.submit()} onCancel={() => setTypeModal(false)} destroyOnClose>
        <Form form={typeForm} layout="vertical" onFinish={(v) => saveType.mutate(v)}>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="类型标识" name="type" rules={[{ required: true }]}><Input disabled={!!editingType} placeholder="如 sys_user_gender" /></Form.Item>
          <Form.Item label="备注" name="remark"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>

      <Modal open={dataModal} title={editingData ? '编辑字典数据' : '新增字典数据'} onOk={() => dataForm.submit()} onCancel={() => setDataModal(false)} destroyOnClose>
        <Form form={dataForm} layout="vertical" onFinish={(v) => saveData.mutate(v)}>
          <Form.Item label="标签" name="label" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="键值" name="value" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="标签颜色" name="tagType"><Input placeholder="如 success / error / blue" /></Form.Item>
          <Form.Item label="排序" name="sort" initialValue={0}><Input type="number" /></Form.Item>
        </Form>
      </Modal>
    </Row>
  );
}
