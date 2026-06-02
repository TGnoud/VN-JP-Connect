import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { buildPasswordResetEmailHtml } from './password-reset-email.template';

export interface PasswordResetMailPayload {
  to: string;
  otp: string;
  otpTtlMinutes: number;
}

function mailTransportMode(): 'resend' | 'log' | 'smtp' {
  const raw = process.env.PASSWORD_RESET_MAIL_MODE?.trim().toLowerCase();
  if (raw === 'log') return 'log';
  if (raw === 'smtp') return 'smtp';
  return 'resend';
}

export function passwordResetUsesLogOnlyMail(): boolean {
  return mailTransportMode() === 'log';
}

@Injectable()
export class ResendMailService {
  private readonly logger = new Logger(ResendMailService.name);
  private smtpTransporter: nodemailer.Transporter | null = null;

  async sendPasswordResetOtpMail(payload: PasswordResetMailPayload) {
    const mode = mailTransportMode();

    // 1. Local QA without Resend: set PASSWORD_RESET_MAIL_MODE=log in .env — OTP is echoed to the server terminal.
    if (mode === 'log') {
      this.logger.warn(
        `[PASSWORD_RESET_MAIL_MODE=log] OTP for ${payload.to}: ${payload.otp} (expires in ${payload.otpTtlMinutes} min — use this on /forgot-password)`,
      );
      return { id: 'stdout-only' as const };
    }

    const html = buildPasswordResetEmailHtml({
      otp: payload.otp,
      minutesValid: payload.otpTtlMinutes,
    });

    const subject = `[VN-JP Connect] パスワード再設定 — 確認コード（${payload.otpTtlMinutes}分有効）`;

    // 2. SMTP Mode (e.g. Gmail SMTP)
    if (mode === 'smtp') {
      const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
      const port = Number(process.env.SMTP_PORT?.trim()) || 465;
      const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE.trim() === 'true' : port === 465;
      const user = process.env.SMTP_USER?.trim();
      const pass = process.env.SMTP_PASS?.trim();

      if (!user || !pass) {
        this.logger.warn(
          'SMTP_USER or SMTP_PASS is unset; refusing to silently skip email delivery.',
        );
        throw new MailTransportNotConfiguredError();
      }

      try {
        if (!this.smtpTransporter) {
          this.smtpTransporter = nodemailer.createTransport({
            host,
            port,
            secure,
            family: 4, // Force IPv4 to avoid IPv6 ENETUNREACH issues
            auth: {
              user,
              pass,
            },
          } as any);
        }

        const info = await this.smtpTransporter.sendMail({
          from: `"VN-JP Connect" <${user}>`,
          to: payload.to,
          subject,
          html,
        });

        this.logger.log(`SMTP Email sent to ${payload.to}: messageId=${info.messageId}`);
        return { id: info.messageId };
      } catch (err: unknown) {
        const detail = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `SMTP failed sending to ${payload.to} via "${host}": ${detail}`,
        );
        throw new ResendRequestFailedError(detail);
      }
    }

    // 3. Resend API Mode
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY is unset; refusing to silently skip email delivery.',
      );
      throw new MailTransportNotConfiguredError();
    }

    const from = process.env.RESEND_FROM_EMAIL?.trim();
    if (!from) {
      this.logger.warn('RESEND_FROM_EMAIL is unset.');
      throw new MailTransportNotConfiguredError();
    }

    let data: { id?: string | null } | null = null;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: payload.to,
          subject,
          html,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { id?: string | null; message?: string; error?: string }
        | null;

      if (!response.ok) {
        const message =
          body?.message ?? body?.error ?? `HTTP ${response.status}`;
        this.logger.error(
          `Resend API error (${payload.to}) from="${from}": ${message}`,
        );
        throw new ResendRequestFailedError(message);
      }

      data = body;
    } catch (maybeErr: unknown) {
      if (maybeErr instanceof ResendRequestFailedError) {
        throw maybeErr;
      }
      const detail =
        maybeErr instanceof Error ? maybeErr.message : String(maybeErr);
      this.logger.error(
        `Resend threw (${payload.to}) from="${from}": ${detail}`,
      );
      throw new ResendRequestFailedError(detail);
    }

    return { id: data?.id ?? null };
  }
}

/** Distinguishable error types without coupling the adapter to Nest HTTP layer. */
export class MailTransportNotConfiguredError extends Error {
  readonly name = 'MailTransportNotConfiguredError';
}

export class ResendRequestFailedError extends Error {
  readonly name = 'ResendRequestFailedError';
}
