/** Valid OTP lifetime (requirements: 1 minute). */
export const OTP_TTL_MS = 60_000;

export const OTP_TTL_MINUTES = Math.max(1, Math.round(OTP_TTL_MS / 60_000));

/**
 * Separate from OTP expiry — users can compose a compliant password calmly.
 */
export const RESET_SESSION_TTL_MS = 10 * 60_000;

export const FALLBACK_DEV_PEPPER =
  '__dev-password-reset-pepper-change-in-env__';

/** User-facing Japanese copy for forgot-password APIs (explicit security UX). */
export const PasswordResetMessages = {
  genericSendConfirmation:
    'メールアドレスがご登録内容と一致する場合、確認コードを送信しました。',
  wrongOtp: '確認コードが正しくありません。',
  expiredOtp:
    '確認コードの有効期限が切れました。コードを再送して再度お試しください。',
  mailSendFailedTryLater:
    'メール送信に失敗しました。時間をおいて再度お試しください。',
  passwordResetNotConfigured:
    'Password reset is currently unavailable.',
  invalidOrExpiredResetSession:
    'セッションが無効か有効期限切れです。最初からやり直してください。',
  passwordComplexity:
    'パスワードは8文字以上で、英大文字・英小文字・数字をそれぞれ1文字以上含めてください。',
} as const;
