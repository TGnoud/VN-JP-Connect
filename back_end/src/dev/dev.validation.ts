import { BadRequestException } from '@nestjs/common';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export type TestEmailBody = { email: string };

export function validateTestEmailBody(body: unknown): TestEmailBody {
  if (!isRecord(body)) {
    throw new BadRequestException('body must be a JSON object');
  }
  const raw = body.email;
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new BadRequestException('email is required');
  }
  const email = raw.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    throw new BadRequestException('email must be a valid address');
  }
  return { email };
}
