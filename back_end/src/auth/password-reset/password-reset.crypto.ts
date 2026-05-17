import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';

const OTP_LENGTH = 6;

/**
 * Hash secrets with a server pepper so DB leaks don't immediately reveal OTPs/tokens.
 */
export function hmacHex(pepper: string, payload: string): string {
  return createHmac('sha256', pepper).update(payload).digest('hex');
}

export function hashOtp(pepper: string, email: string, otp: string): string {
  return hmacHex(pepper, `otp:${email.toLowerCase()}:${otp}`);
}

export function hashResetToken(
  pepper: string,
  email: string,
  token: string,
): string {
  return hmacHex(pepper, `reset:${email.toLowerCase()}:${token}`);
}

export function generateNumericOtp(): string {
  // Inclusive-exclusive range [0, 1_000_000) padded to OTP_LENGTH.
  return randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, '0');
}

export function generateResetToken(): string {
  return randomBytes(24).toString('hex');
}

export function safeEqualHex(expectedHex: string, actualHex: string): boolean {
  try {
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(actualHex, 'hex');
    if (a.length !== b.length || a.length === 0) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
