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

const cleanPhone = (value: string) => value.replace(/[^+\d]/g, '');

const postJson = async (url: string, body: unknown, headers: Record<string, string>) => {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const text = await response.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(data?.error?.message || data?.message || `Provider HTTP ${response.status}`);
  return data;
};

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
        auth: { user: env.smtp.user, pass: env.smtp.pass },
      });
      const result = await transporter.sendMail({
        from: env.supportEmail,
        to: payload.to,
        subject: payload.subject ?? 'AttendancePro Notification',
        text: payload.message,
      });
      return { status: 'SENT', providerRef: result.messageId };
    } catch (error) {
      return { status: 'FAILED', error: error instanceof Error ? error.message : 'Email delivery failed' };
    }
  }
}

export class SmsProvider implements NotificationProvider {
  async send(payload: NotificationProviderPayload): Promise<NotificationProviderResult> {
    if (!env.twilio.accountSid || !env.twilio.authToken || !env.twilio.fromNumber) {
      return { status: 'SKIPPED', error: 'Twilio SMS is not configured' };
    }
    const to = cleanPhone(payload.to);
    if (!to || to === 'not-configured') return { status: 'SKIPPED', error: 'Recipient phone number is missing' };
    try {
      const form = new URLSearchParams({ To: to, From: env.twilio.fromNumber, Body: payload.message });
      const auth = Buffer.from(`${env.twilio.accountSid}:${env.twilio.authToken}`).toString('base64');
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.twilio.accountSid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });
      const data: any = await response.json();
      if (!response.ok) throw new Error(data.message || 'Twilio SMS delivery failed');
      return { status: 'SENT', providerRef: data.sid };
    } catch (error) {
      return { status: 'FAILED', error: error instanceof Error ? error.message : 'SMS delivery failed' };
    }
  }
}

export class WhatsAppProvider implements NotificationProvider {
  async send(payload: NotificationProviderPayload): Promise<NotificationProviderResult> {
    const to = cleanPhone(payload.to);
    if (!to || to === 'not-configured') return { status: 'SKIPPED', error: 'Recipient WhatsApp number is missing' };

    if (env.whatsappCloud.token && env.whatsappCloud.phoneNumberId) {
      try {
        const body = env.whatsappCloud.templateName
          ? {
              messaging_product: 'whatsapp',
              to,
              type: 'template',
              template: {
                name: env.whatsappCloud.templateName,
                language: { code: env.whatsappCloud.templateLang || 'en' },
                components: [{ type: 'body', parameters: [{ type: 'text', text: payload.message.slice(0, 1024) }] }],
              },
            }
          : { messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: false, body: payload.message } };
        const data = await postJson(`https://graph.facebook.com/v20.0/${env.whatsappCloud.phoneNumberId}/messages`, body, {
          Authorization: `Bearer ${env.whatsappCloud.token}`,
        });
        return { status: 'SENT', providerRef: data?.messages?.[0]?.id };
      } catch (error) {
        return { status: 'FAILED', error: error instanceof Error ? error.message : 'WhatsApp Cloud delivery failed' };
      }
    }

    if (env.twilio.accountSid && env.twilio.authToken && env.twilio.whatsappFrom) {
      try {
        const form = new URLSearchParams({ To: `whatsapp:${to}`, From: env.twilio.whatsappFrom, Body: payload.message });
        const auth = Buffer.from(`${env.twilio.accountSid}:${env.twilio.authToken}`).toString('base64');
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.twilio.accountSid}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form,
        });
        const data: any = await response.json();
        if (!response.ok) throw new Error(data.message || 'Twilio WhatsApp delivery failed');
        return { status: 'SENT', providerRef: data.sid };
      } catch (error) {
        return { status: 'FAILED', error: error instanceof Error ? error.message : 'WhatsApp delivery failed' };
      }
    }

    return { status: 'SKIPPED', error: 'WhatsApp provider is not configured' };
  }
}

export const providers = {
  email: new EmailProvider(),
  sms: new SmsProvider(),
  whatsapp: new WhatsAppProvider(),
};
