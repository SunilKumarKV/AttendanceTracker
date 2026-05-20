import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export interface NotificationProviderPayload {
  to: string;
  subject?: string;
  message: string;
}

export interface NotificationProviderResult {
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  providerRef?: string;
  error?: string;
}

export interface NotificationProvider {
  send(payload: NotificationProviderPayload): Promise<NotificationProviderResult>;
}

export class EmailProvider implements NotificationProvider {
  async send(payload: NotificationProviderPayload): Promise<NotificationProviderResult> {
    if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
      return { status: 'SKIPPED', error: 'SMTP is not configured' };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: {
          user: env.smtp.user,
          pass: env.smtp.pass,
        },
      });
      const result = await transporter.sendMail({
        from: env.supportEmail,
        to: payload.to,
        subject: payload.subject ?? 'AttendanceTracker Notification',
        text: payload.message,
      });
      return { status: 'SENT', providerRef: result.messageId };
    } catch (error) {
      return { status: 'FAILED', error: error instanceof Error ? error.message : 'Email delivery failed' };
    }
  }
}

export class SmsProvider implements NotificationProvider {
  async send(): Promise<NotificationProviderResult> {
    return { status: 'SKIPPED', error: 'SMS provider is not configured yet' };
  }
}

export class WhatsAppProvider implements NotificationProvider {
  async send(): Promise<NotificationProviderResult> {
    return { status: 'SKIPPED', error: 'WhatsApp provider is not configured yet' };
  }
}

export const providers = {
  email: new EmailProvider(),
  sms: new SmsProvider(),
  whatsapp: new WhatsAppProvider(),
};
