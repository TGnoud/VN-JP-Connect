import { BadRequestException } from '@nestjs/common';
import { PasswordResetMessages } from './password-reset.constants';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** RFC5322-lite; keeps parity with frontend checks. */
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

function requireJpCondition(ok: boolean, messageJa: string): void {
  if (!ok) {
    throw new BadRequestException(messageJa);
  }
}

function trimJpField(value: unknown, emptyMessageJa: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(emptyMessageJa);
  }
  const t = value.trim();
  requireJpCondition(Boolean(t), emptyMessageJa);
  return t;
}

export type SendOtpBody = { email: string };

export function validateSendOtpBody(body: unknown): SendOtpBody {
  if (!isRecord(body)) {
    throw new BadRequestException('入力形式が無効です。');
  }
  const emailRaw = trimJpField(
    body.email,
    'メールアドレスを入力してください。',
  ).toLowerCase();
  requireJpCondition(
    EMAIL_REGEX.test(emailRaw),
    '有効なメールアドレスを入力してください。',
  );
  return { email: emailRaw };
}

export type VerifyOtpBody = { email: string; otp: string };

export function validateVerifyOtpBody(body: unknown): VerifyOtpBody {
  if (!isRecord(body)) {
    throw new BadRequestException('入力形式が無効です。');
  }
  const email = trimJpField(
    body.email,
    'メールアドレスを入力してください。',
  ).toLowerCase();
  requireJpCondition(
    EMAIL_REGEX.test(email),
    '有効なメールアドレスを入力してください。',
  );
  const otp = trimJpField(body.otp, '確認コードを入力してください。');
  requireJpCondition(/^\d{6}$/.test(otp), '確認コードは6桁の数字で入力してください。');
  return { email, otp };
}

const PASS_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export type CompleteResetBody = {
  email: string;
  resetToken: string;
  newPassword: string;
};

export function validateCompleteResetBody(body: unknown): CompleteResetBody {
  if (!isRecord(body)) {
    throw new BadRequestException('入力形式が無効です。');
  }
  const email = trimJpField(
    body.email,
    'メールアドレスを入力してください。',
  ).toLowerCase();
  requireJpCondition(
    EMAIL_REGEX.test(email),
    '有効なメールアドレスを入力してください。',
  );
  const resetToken = trimJpField(
    body.resetToken,
    '確認用トークンが必要です。もう一度手順を開始してください。',
  );
  /** Opaque hex token emitted by `/verify-otp` — keep length stable for observability */
  requireJpCondition(
    /^[a-f0-9]{48}$/.test(resetToken),
    '確認用トークンが無効です。最初からやり直してください。',
  );

  const newPassword = trimJpField(
    body.newPassword,
    '新しいパスワードを入力してください。',
  );
  requireJpCondition(
    PASS_COMPLEXITY_REGEX.test(newPassword),
    PasswordResetMessages.passwordComplexity,
  );

  return { email, resetToken, newPassword };
}
