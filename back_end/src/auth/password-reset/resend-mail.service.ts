import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dns from 'dns';
import { isIP } from 'net';
import { buildPasswordResetEmailHtml } from './password-reset-email.template';
import { buildRegisterOtpEmailHtml } from '../register-otp-email.template';

export interface PasswordResetMailPayload {
  to: string;
  otp: string;
  otpTtlMinutes: number;
}

export interface RegisterOtpMailPayload {
  to: string;
  otp: string;
  otpTtlMinutes: number;
}

interface PreparedMailPayload {
  to: string;
  subject: string;
  html: string;
  otp: string;
  otpTtlMinutes: number;
  purpose: string;
}

function mailTransportMode(): 'resend' | 'log' | 'smtp' | 'gmail-api' {
  const raw = process.env.PASSWORD_RESET_MAIL_MODE?.trim().toLowerCase();
  if (raw === 'log') return 'log';
  if (raw === 'smtp') return 'smtp';
  if (raw === 'gmail-api' || raw === 'gmail_api' || raw === 'gmail') {
    return 'gmail-api';
  }
  return 'resend';
}

export function currentPasswordResetMailMode() {
  return mailTransportMode();
}

export function passwordResetUsesLogOnlyMail(): boolean {
  return mailTransportMode() === 'log';
}

@Injectable()
export class ResendMailService {
  private readonly logger = new Logger(ResendMailService.name);
  private smtpTransporter: nodemailer.Transporter | null = null;
  private smtpTransporterKey: string | null = null;

  private async createSmtpTransporter(options: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  }) {
    const { host, port, secure, user, pass } = options;
    const cacheKey = `${host}:${port}:${secure}:${user}`;

    if (this.smtpTransporter && this.smtpTransporterKey === cacheKey) {
      return this.smtpTransporter;
    }

    const connectionHost = await this.resolveSmtpHostToIpv4(host);
    this.smtpTransporter = nodemailer.createTransport({
      host: connectionHost,
      port,
      secure,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      auth: {
        user,
        pass,
      },
      tls: {
        servername: host,
      },
    } as nodemailer.TransportOptions);
    this.smtpTransporterKey = cacheKey;

    if (connectionHost !== host) {
      this.logger.log(
        `SMTP transport resolved ${host}:${port} to IPv4 ${connectionHost}:${port}.`,
      );
    }

    return this.smtpTransporter;
  }

  private async resolveSmtpHostToIpv4(host: string) {
    if (isIP(host) === 4) {
      return host;
    }

    try {
      const addresses = await dns.promises.resolve4(host);
      const address = addresses[0];

      if (!address) {
        throw new Error(`No IPv4 addresses returned for ${host}`);
      }

      return address;
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`SMTP IPv4 DNS resolution failed for "${host}": ${detail}`);
      throw new ResendRequestFailedError(detail);
    }
  }

  private async getGmailApiAccessToken() {
    const clientId = process.env.GMAIL_CLIENT_ID?.trim();
    const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();

    if (!clientId || !clientSecret || !refreshToken) {
      this.logger.warn(
        'GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN is unset.',
      );
      throw new MailTransportNotConfiguredError();
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const body = (await response.json().catch(() => null)) as
      | { access_token?: string; error?: string; error_description?: string }
      | null;

    if (!response.ok || !body?.access_token) {
      const message =
        body?.error_description ??
        body?.error ??
        `Gmail OAuth token HTTP ${response.status}`;
      throw new ResendRequestFailedError(message);
    }

    return body.access_token;
  }

  private buildGmailApiRawMessage(options: {
    fromEmail: string;
    toEmail: string;
    subject: string;
    html: string;
  }) {
    const encodedFromName = Buffer.from('VN-JP Connect', 'utf8').toString('base64');
    const encodedSubject = Buffer.from(options.subject, 'utf8').toString('base64');
    const encodedHtml = Buffer.from(options.html, 'utf8').toString('base64');

    const message = [
      `From: =?UTF-8?B?${encodedFromName}?= <${options.fromEmail}>`,
      `To: ${options.toEmail}`,
      `Subject: =?UTF-8?B?${encodedSubject}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodedHtml,
    ].join('\r\n');

    return Buffer.from(message, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private async sendWithGmailApi(options: {
    to: string;
    subject: string;
    html: string;
  }) {
    const fromEmail = process.env.GMAIL_FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim();

    if (!fromEmail) {
      this.logger.warn('GMAIL_FROM_EMAIL or SMTP_USER is unset.');
      throw new MailTransportNotConfiguredError();
    }

    const accessToken = await this.getGmailApiAccessToken();
    const raw = this.buildGmailApiRawMessage({
      fromEmail,
      toEmail: options.to,
      subject: options.subject,
      html: options.html,
    });

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      },
    );

    const body = (await response.json().catch(() => null)) as
      | { id?: string; error?: { message?: string } }
      | null;

    if (!response.ok || !body?.id) {
      const message = body?.error?.message ?? `Gmail API HTTP ${response.status}`;
      throw new ResendRequestFailedError(message);
    }

    this.logger.log(`Gmail API email sent to ${options.to}: messageId=${body.id}`);
    return { id: body.id };
  }

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

    // 2. Gmail API mode sends over HTTPS instead of SMTP, avoiding blocked SMTP ports.
    if (mode === 'gmail-api') {
      try {
        this.logger.log(`Gmail API sending password reset OTP to ${payload.to}.`);
        return await this.sendWithGmailApi({
          to: payload.to,
          subject,
          html,
        });
      } catch (err: unknown) {
        if (err instanceof MailTransportNotConfiguredError) {
          throw err;
        }

        const detail = err instanceof Error ? err.message : String(err);
        this.logger.error(`Gmail API failed sending to ${payload.to}: ${detail}`);
        throw new ResendRequestFailedError(detail);
      }
    }

    // 3. SMTP Mode (e.g. Gmail SMTP)
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
        const transporter = await this.createSmtpTransporter({
          host,
          port,
          secure,
          user,
          pass,
        });

        this.logger.log(`SMTP sending password reset OTP to ${payload.to} via ${host}:${port}.`);

        const info = await transporter.sendMail({
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

    // 4. Resend API Mode
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

  async sendRegisterOtpMail(payload: RegisterOtpMailPayload) {
    const mode = mailTransportMode();

    if (mode === 'log') {
      this.logger.warn(
        `[PASSWORD_RESET_MAIL_MODE=log] Registration OTP for ${payload.to}: ${payload.otp} (expires in ${payload.otpTtlMinutes} min)`,
      );
      return { id: 'stdout-only' as const };
    }

    const html = buildRegisterOtpEmailHtml({
      otp: payload.otp,
      minutesValid: payload.otpTtlMinutes,
    });
    const subject = `[VN-JP Connect] Registration verification code (${payload.otpTtlMinutes} min)`;

    if (mode === 'gmail-api') {
      try {
        this.logger.log(`Gmail API sending registration OTP to ${payload.to}.`);
        return await this.sendWithGmailApi({
          to: payload.to,
          subject,
          html,
        });
      } catch (err: unknown) {
        if (err instanceof MailTransportNotConfiguredError) {
          throw err;
        }

        const detail = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Gmail API failed sending registration OTP to ${payload.to}: ${detail}`,
        );
        throw new ResendRequestFailedError(detail);
      }
    }

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
        const transporter = await this.createSmtpTransporter({
          host,
          port,
          secure,
          user,
          pass,
        });

        this.logger.log(
          `SMTP sending registration OTP to ${payload.to} via ${host}:${port}.`,
        );

        const info = await transporter.sendMail({
          from: `"VN-JP Connect" <${user}>`,
          to: payload.to,
          subject,
          html,
        });

        this.logger.log(
          `SMTP registration email sent to ${payload.to}: messageId=${info.messageId}`,
        );
        return { id: info.messageId };
      } catch (err: unknown) {
        const detail = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `SMTP failed sending registration OTP to ${payload.to} via "${host}": ${detail}`,
        );
        throw new ResendRequestFailedError(detail);
      }
    }

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
          `Resend API error (registration OTP to ${payload.to}) from="${from}": ${message}`,
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
        `Resend threw (registration OTP to ${payload.to}) from="${from}": ${detail}`,
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
