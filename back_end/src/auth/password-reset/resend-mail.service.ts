import { Injectable, Logger } from '@nestjs/common';
import { buildPasswordResetEmailHtml } from './password-reset-email.template';

export interface PasswordResetMailPayload {
  to: string;
  otp: string;
  otpTtlMinutes: number;
}

function mailTransportMode(): 'resend' | 'log' {
  const raw = process.env.PASSWORD_RESET_MAIL_MODE?.trim().toLowerCase();
  return raw === 'log' ? 'log' : 'resend';
}

export function passwordResetUsesLogOnlyMail(): boolean {
  return mailTransportMode() === 'log';
}

@Injectable()
export class ResendMailService {
  private readonly logger = new Logger(ResendMailService.name);

  async sendPasswordResetOtpMail(payload: PasswordResetMailPayload) {
    // Local QA without Resend: set PASSWORD_RESET_MAIL_MODE=log in .env — OTP is echoed to the server terminal.
    if (mailTransportMode() === 'log') {
      this.logger.warn(
        `[PASSWORD_RESET_MAIL_MODE=log] OTP for ${payload.to}: ${payload.otp} (expires in ${payload.otpTtlMinutes} min — use this on /forgot-password)`,
      );
      return { id: 'stdout-only' as const };
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

    const html = buildPasswordResetEmailHtml({
      otp: payload.otp,
      minutesValid: payload.otpTtlMinutes,
    });

    const subject = `[VN-JP Connect] パスワード再設定 — 確認コード（${payload.otpTtlMinutes}分有効）`;

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
        // Log full diagnostic; UI stays generic JP (enumeration / UX consistency).
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
