import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface ChannelPayload {
  title: string;
  content: string;
  /** 邮件收件人 / webhook 不需要 */
  to?: string;
}

/**
 * 多通道消息适配器。INTERNAL 由 MessageService 负责落库与 WS 推送，
 * 这里负责对外通道：EMAIL / SMS / WEBHOOK。通道未配置时安全降级（记录日志）。
 */
@Injectable()
export class MessageChannelService {
  private readonly logger = new Logger(MessageChannelService.name);
  private mailTransport?: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {}

  /** 渲染 {{var}} 占位符 */
  static render(tpl: string, vars: Record<string, unknown> = {}): string {
    return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? ''));
  }

  async dispatch(channel: string, payload: ChannelPayload): Promise<{ ok: boolean; message?: string }> {
    try {
      switch (channel) {
        case 'EMAIL':
          return await this.sendEmail(payload);
        case 'WEBHOOK':
          return await this.sendWebhook(payload);
        case 'SMS':
          // 预留：接入短信服务商时实现
          this.logger.warn(`[SMS] 未配置短信通道，跳过：${payload.title}`);
          return { ok: false, message: 'SMS 通道未配置' };
        default:
          return { ok: true };
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`通道 ${channel} 发送失败: ${message}`);
      return { ok: false, message };
    }
  }

  private getMailTransport(): nodemailer.Transporter | null {
    const host = this.config.get<string>('mail.host');
    if (!host) return null;
    if (!this.mailTransport) {
      this.mailTransport = nodemailer.createTransport({
        host,
        port: this.config.get<number>('mail.port') || 465,
        secure: this.config.get<boolean>('mail.secure') ?? true,
        auth: {
          user: this.config.get<string>('mail.user'),
          pass: this.config.get<string>('mail.pass'),
        },
      });
    }
    return this.mailTransport;
  }

  private async sendEmail(payload: ChannelPayload) {
    const transport = this.getMailTransport();
    if (!transport || !payload.to) {
      this.logger.warn(`[EMAIL] 未配置邮件服务或缺少收件人，跳过：${payload.title}`);
      return { ok: false, message: '邮件通道未配置' };
    }
    await transport.sendMail({
      from: this.config.get<string>('mail.from') || this.config.get<string>('mail.user'),
      to: payload.to,
      subject: payload.title,
      html: payload.content,
    });
    return { ok: true };
  }

  private async sendWebhook(payload: ChannelPayload) {
    const url = this.config.get<string>('mail.webhookUrl');
    if (!url) return { ok: false, message: 'webhook 未配置' };
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: payload.title, content: payload.content }),
    });
    return { ok: true };
  }
}
