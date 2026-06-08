import * as ExcelJS from 'exceljs';

export interface ExcelColumn {
  /** 数据字段名 */
  key: string;
  /** 表头标题 */
  header: string;
  width?: number;
  /** 导入时是否必填 */
  required?: boolean;
}

/** 将数据导出为 xlsx Buffer */
export async function exportToExcel<T extends Record<string, unknown>>(
  columns: ExcelColumn[],
  rows: T[],
  sheetName = 'Sheet1',
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/** 生成仅含表头的导入模板 */
export function buildTemplate(columns: ExcelColumn[]): Promise<Buffer> {
  return exportToExcel(columns, [], '导入模板');
}

export interface ParseResult<T> {
  rows: T[];
  errors: { row: number; message: string }[];
}

/** 解析 xlsx Buffer 为对象数组，按列定义校验必填项，错误行回显 */
export async function parseExcel<T extends Record<string, unknown>>(
  buffer: Buffer,
  columns: ExcelColumn[],
): Promise<ParseResult<T>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<ExcelJS.Workbook['xlsx']['load']>[0]);
  const ws = wb.worksheets[0];
  const rows: T[] = [];
  const errors: { row: number; message: string }[] = [];
  if (!ws) return { rows, errors };

  // 第 1 行表头：建立 列号->key 映射
  const headerRow = ws.getRow(1);
  const colIndexToKey = new Map<number, string>();
  headerRow.eachCell((cell, colNumber) => {
    const header = String(cell.value ?? '').trim();
    const col = columns.find((c) => c.header === header);
    if (col) colIndexToKey.set(colNumber, col.key);
  });

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    if (!row.hasValues) continue;
    const obj: Record<string, unknown> = {};
    colIndexToKey.forEach((key, colNumber) => {
      const v = row.getCell(colNumber).value;
      obj[key] = v === null ? undefined : v;
    });
    const missing = columns
      .filter((c) => c.required && (obj[c.key] === undefined || obj[c.key] === ''))
      .map((c) => c.header);
    if (missing.length) {
      errors.push({ row: i, message: `缺少必填项：${missing.join('、')}` });
      continue;
    }
    rows.push(obj as T);
  }
  return { rows, errors };
}
