import { ConsoleLogger, LogLevel } from '@nestjs/common';

/**
 * 结构化(JSON)日志：生产环境输出单行 JSON，便于采集(ELK/Loki)。
 * 开发环境(NODE_ENV!==production)沿用 Nest 彩色日志，便于阅读。
 */
export class JsonLogger extends ConsoleLogger {
  private readonly json = process.env.NODE_ENV === 'production';

  private emit(level: LogLevel, message: unknown, context?: string) {
    if (!this.json) {
      return;
    }
    process.stdout.write(
      JSON.stringify({
        time: new Date().toISOString(),
        level,
        context: context ?? this.context,
        message: typeof message === 'string' ? message : JSON.stringify(message),
        pid: process.pid,
      }) + '\n',
    );
  }

  log(message: unknown, context?: string) {
    if (this.json) return this.emit('log', message, context);
    super.log(message as string, context as string);
  }
  error(message: unknown, stack?: string, context?: string) {
    if (this.json) return this.emit('error', message, context ?? stack);
    super.error(message as string, stack as string, context as string);
  }
  warn(message: unknown, context?: string) {
    if (this.json) return this.emit('warn', message, context);
    super.warn(message as string, context as string);
  }
  debug(message: unknown, context?: string) {
    if (this.json) return this.emit('debug', message, context);
    super.debug(message as string, context as string);
  }
  verbose(message: unknown, context?: string) {
    if (this.json) return this.emit('verbose', message, context);
    super.verbose(message as string, context as string);
  }
}
