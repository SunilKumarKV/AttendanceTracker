import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const hasSmtpConfig = () => Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

export const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  if (!hasSmtpConfig()) {
    logger.warn('Password reset email was requested but SMTP is not configured.');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Reset your AttendanceTracker password',
    text: `Use this secure link to reset your password. It expires soon.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Use this secure link to reset your password. It expires soon.</p><p><a href="${resetUrl}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });

  return true;
};
