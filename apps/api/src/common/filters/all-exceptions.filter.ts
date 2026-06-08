import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BizCode } from '@nice-admin/shared';

/** 将 HTTP 状态码映射为业务码 */
function mapHttpStatusToBizCode(status: number): BizCode {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return BizCode.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return BizCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return BizCode.NOT_FOUND;
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return BizCode.VALIDATION;
    default:
      return BizCode.ERROR;
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = BizCode.SERVER_ERROR;

      if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const m = (res as Record<string, unknown>).message;
        message = Array.isArray(m) ? (m as string[]).join('; ') : String(m ?? exception.message);
      }
      code = mapHttpStatusToBizCode(status);
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status >= 100 && status < 600 ? status : 500).json({
      code,
      message,
      data: null,
      timestamp: Date.now(),
      path: request.url,
    });
  }
}
