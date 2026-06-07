import { SetMetadata } from '@nestjs/common';

export const OPER_LOG_KEY = 'operLog';

export interface OperLogOptions {
  title: string;
  businessType?: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'IMPORT' | 'OTHER' | 'GRANT';
}

/** 标记接口需要记录操作日志 */
export const OperLog = (options: OperLogOptions) => SetMetadata(OPER_LOG_KEY, options);
