export interface GenColumn {
  /** 字段名 camelCase */
  name: string;
  /** 中文注释 */
  comment: string;
  /** ts 类型 string|number|boolean|Date */
  tsType: string;
  /** prisma 类型 String|Int|Boolean|DateTime */
  prismaType: string;
  /** 前端控件 input|textarea|number|select|switch|date */
  widget: string;
  isRequired: boolean;
  isQuery: boolean;
  isList: boolean;
  isEdit: boolean;
}

export interface GenContext {
  className: string; // Product
  businessName: string; // product
  functionName: string; // 商品
  moduleName: string; // business
  tableComment: string;
  columns: GenColumn[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function classValidatorDecorator(col: GenColumn): string {
  const map: Record<string, string> = {
    string: 'IsString',
    number: 'IsInt',
    boolean: 'IsBoolean',
    Date: 'IsDateString',
  };
  const dec = map[col.tsType] || 'IsString';
  const lines: string[] = [];
  if (!col.isRequired) lines.push('  @IsOptional()');
  lines.push(`  @${dec}()`);
  lines.push(`  ${col.name}${col.isRequired ? '!' : '?'}: ${col.tsType};`);
  return lines.join('\n');
}

export function genPrismaModel(ctx: GenContext): string {
  const fields = ctx.columns
    .map((c) => `  ${c.name} ${c.prismaType}${c.isRequired ? '' : '?'} // ${c.comment}`)
    .join('\n');
  return `model ${ctx.className} {
  id        Int      @id @default(autoincrement())
${fields}
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("${ctx.moduleName}_${ctx.businessName}")
}`;
}

export function genDto(ctx: GenContext): string {
  const decorators = new Set(['IsOptional']);
  ctx.columns.forEach((c) => {
    decorators.add(
      { string: 'IsString', number: 'IsInt', boolean: 'IsBoolean', Date: 'IsDateString' }[c.tsType] || 'IsString',
    );
  });
  const fields = ctx.columns.map(classValidatorDecorator).join('\n\n');
  return `import { PartialType } from '@nestjs/swagger';
import { ${[...decorators].join(', ')} } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class Create${ctx.className}Dto {
${fields}
}

export class Update${ctx.className}Dto extends PartialType(Create${ctx.className}Dto) {}

export class Query${ctx.className}Dto extends PaginationDto {}`;
}

export function genService(ctx: GenContext): string {
  const model = ctx.businessName;
  return `import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPageResult } from '../../common/utils/pagination.util';
import { Create${ctx.className}Dto, Query${ctx.className}Dto, Update${ctx.className}Dto } from './${model}.dto';

@Injectable()
export class ${ctx.className}Service {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Query${ctx.className}Dto) {
    const [list, total] = await this.prisma.$transaction([
      this.prisma.${model}.findMany({ skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.${model}.count(),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async findOne(id: number) {
    const item = await this.prisma.${model}.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('记录不存在');
    return item;
  }

  create(dto: Create${ctx.className}Dto) {
    return this.prisma.${model}.create({ data: dto });
  }

  update(id: number, dto: Update${ctx.className}Dto) {
    return this.prisma.${model}.update({ where: { id }, data: dto });
  }

  async remove(ids: number[]) {
    await this.prisma.${model}.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }
}`;
}

export function genController(ctx: GenContext): string {
  const perm = `${ctx.moduleName}:${ctx.businessName}`;
  return `import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ${ctx.className}Service } from './${ctx.businessName}.service';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Create${ctx.className}Dto, Query${ctx.className}Dto, Update${ctx.className}Dto } from './${ctx.businessName}.dto';

@ApiTags('${ctx.functionName}管理')
@ApiBearerAuth()
@Controller('${ctx.moduleName}/${ctx.businessName}')
export class ${ctx.className}Controller {
  constructor(private readonly service: ${ctx.className}Service) {}

  @Get()
  @RequirePermissions('${perm}:list')
  list(@Query() query: Query${ctx.className}Dto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('${perm}:query')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('${perm}:add')
  create(@Body() dto: Create${ctx.className}Dto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequirePermissions('${perm}:edit')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Update${ctx.className}Dto) {
    return this.service.update(id, dto);
  }

  @Delete(':ids')
  @RequirePermissions('${perm}:delete')
  remove(@Param('ids') ids: string) {
    return this.service.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }
}`;
}

export function genApiTs(ctx: GenContext): string {
  return `import { http } from '@/api/http';
import type { PageResult } from '@nice-admin/shared';

const base = '/${ctx.moduleName}/${ctx.businessName}';

export interface ${ctx.className} {
  id: number;
${ctx.columns.map((c) => `  ${c.name}: ${c.tsType === 'Date' ? 'string' : c.tsType};`).join('\n')}
}

export const ${ctx.businessName}Api = {
  list: (params: Record<string, unknown>) => http.get<PageResult<${ctx.className}>>(base, { params }),
  detail: (id: number) => http.get<${ctx.className}>(\`\${base}/\${id}\`),
  create: (data: Partial<${ctx.className}>) => http.post(base, data),
  update: (id: number, data: Partial<${ctx.className}>) => http.put(\`\${base}/\${id}\`, data),
  remove: (ids: number[]) => http.delete(\`\${base}/\${ids.join(',')}\`),
};`;
}

export function genReactPage(ctx: GenContext): string {
  const columns = ctx.columns
    .filter((c) => c.isList)
    .map((c) => `    { title: '${c.comment}', dataIndex: '${c.name}' },`)
    .join('\n');
  const formItems = ctx.columns
    .filter((c) => c.isEdit)
    .map(
      (c) => `      <Form.Item label="${c.comment}" name="${c.name}"${c.isRequired ? ` rules={[{ required: true }]}` : ''}>
        <Input />
      </Form.Item>`,
    )
    .join('\n');
  return `import { useState } from 'react';
import { Button, Form, Input, Modal, Table, Space, Popconfirm, message } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ${ctx.businessName}Api, type ${ctx.className} } from '@/api/${ctx.businessName}';

export default function ${ctx.className}Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<${ctx.className} | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['${ctx.businessName}'],
    queryFn: () => ${ctx.businessName}Api.list({ page: 1, pageSize: 10 }),
  });

  const saveMutation = useMutation({
    mutationFn: (values: Partial<${ctx.className}>) =>
      editing ? ${ctx.businessName}Api.update(editing.id, values) : ${ctx.businessName}Api.create(values),
    onSuccess: () => {
      message.success('保存成功');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['${ctx.businessName}'] });
    },
  });

  const columns = [
${columns}
    {
      title: '操作',
      render: (_: unknown, record: ${ctx.className}) => (
        <Space>
          <a onClick={() => { setEditing(record); form.setFieldsValue(record); setOpen(true); }}>编辑</a>
          <Popconfirm title="确认删除?" onConfirm={async () => { await ${ctx.businessName}Api.remove([record.id]); qc.invalidateQueries({ queryKey: ['${ctx.businessName}'] }); }}>
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新增</Button>
      <Table rowKey="id" loading={isLoading} columns={columns} dataSource={data?.list} style={{ marginTop: 16 }} />
      <Modal open={open} title={editing ? '编辑' : '新增'} onOk={() => form.submit()} onCancel={() => setOpen(false)}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
${formItems}
        </Form>
      </Modal>
    </div>
  );
}`;
}

export interface GeneratedFile {
  filename: string;
  language: string;
  content: string;
}

export function generateAll(ctx: GenContext): GeneratedFile[] {
  return [
    { filename: `prisma: model ${ctx.className}`, language: 'prisma', content: genPrismaModel(ctx) },
    { filename: `${ctx.businessName}.dto.ts`, language: 'typescript', content: genDto(ctx) },
    { filename: `${ctx.businessName}.service.ts`, language: 'typescript', content: genService(ctx) },
    { filename: `${ctx.businessName}.controller.ts`, language: 'typescript', content: genController(ctx) },
    { filename: `api/${ctx.businessName}.ts`, language: 'typescript', content: genApiTs(ctx) },
    { filename: `${cap(ctx.businessName)}Page.tsx`, language: 'tsx', content: genReactPage(ctx) },
  ];
}
