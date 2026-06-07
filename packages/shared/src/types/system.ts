export interface DictItem {
  label: string;
  value: string;
  /** AntD tag 颜色 */
  tagType?: string | null;
  cssClass?: string | null;
}

/** 低代码表单字段 schema */
export interface FormField {
  key: string;
  label: string;
  /** input | textarea | number | select | radio | checkbox | switch | date | upload */
  widget: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  /** select/radio/checkbox 选项 */
  options?: { label: string; value: string | number }[];
  /** 栅格宽度 1-24 */
  span?: number;
  rules?: Record<string, unknown>[];
}

export interface FormSchemaDefinition {
  title: string;
  /** 表单整体布局 */
  labelWidth?: number;
  fields: FormField[];
}

/** 系统监控指标 */
export interface SystemMetrics {
  cpu: { usage: number; cores: number };
  memory: { total: number; used: number; usage: number };
  disk: { total: number; used: number; usage: number };
  uptime: number;
  loadavg: number[];
  node: { version: string; pid: number };
}
