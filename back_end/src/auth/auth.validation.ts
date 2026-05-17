import { BadRequestException } from '@nestjs/common';
import { NATIONALITIES, type Nationality } from '../database/schemas';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string) {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new BadRequestException(`${field} is required`);
  }
  return trimmed;
}

function requireEmail(email: string) {
  // Minimal check (avoid pulling in extra deps).
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new BadRequestException('email must be a valid email');
  }
  return email;
}

function requirePhoneFormat(value: string) {
  if (!/^[\d\s\-+()]+$/.test(value)) {
    throw new BadRequestException('phoneNumber format is invalid');
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) {
    throw new BadRequestException('phoneNumber format is invalid');
  }
  return value;
}

function requireNationality(value: string): Nationality {
  if (!(NATIONALITIES as readonly string[]).includes(value)) {
    throw new BadRequestException(`nationality must be one of: ${NATIONALITIES.join(', ')}`);
  }
  return value as Nationality;
}

function requireBirthDate(value: unknown) {
  const rawValue = requireString(value, 'birthDate');
  const birthDate = new Date(`${rawValue}T00:00:00.000Z`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawValue) || Number.isNaN(birthDate.getTime())) {
    throw new BadRequestException('birthDate must be a valid YYYY-MM-DD date');
  }

  const [year, month, day] = rawValue.split('-').map(Number);
  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) {
    throw new BadRequestException('birthDate must be a valid YYYY-MM-DD date');
  }

  if (birthDate > new Date()) {
    throw new BadRequestException('birthDate cannot be in the future');
  }

  return birthDate;
}

export type RegisterInput = {
  email: string;
  phoneNumber: string;
  password: string;
  fullName: string;
  nationality: Nationality;
  birthDate: Date;
};

export function validateRegisterBody(body: unknown): RegisterInput {
  if (!isRecord(body)) {
    throw new BadRequestException('body must be an object');
  }

  const email = requireEmail(requireString(body.email, 'email').toLowerCase());
  const phoneNumber = requirePhoneFormat(requireString(body.phoneNumber, 'phoneNumber'));
  const password = requireString(body.password, 'password');
  if (password.length < 6) {
    throw new BadRequestException('password must be at least 6 characters');
  }
  const fullName = requireString(body.fullName, 'fullName');
  const nationality = requireNationality(requireString(body.nationality, 'nationality'));
  const birthDate = requireBirthDate(body.birthDate);

  return { email, phoneNumber, password, fullName, nationality, birthDate };
}

export type LoginIdentifier =
  | { type: 'email'; value: string }
  | { type: 'phone'; value: string; digits: string };

export type LoginInput = {
  identifier: LoginIdentifier;
  password: string;
};

function parseLoginIdentifier(raw: string): LoginIdentifier {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new BadRequestException('identifier is required');
  }
  if (trimmed.includes('@')) {
    return { type: 'email', value: requireEmail(trimmed.toLowerCase()) };
  }
  if (!/^[\d\s\-+()]+$/.test(trimmed)) {
    throw new BadRequestException(
      'identifier must be a valid email or phone number',
    );
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) {
    throw new BadRequestException(
      'identifier must be a valid email or phone number',
    );
  }
  return { type: 'phone', value: trimmed, digits };
}

export function validateLoginBody(body: unknown): LoginInput {
  if (!isRecord(body)) {
    throw new BadRequestException('body must be an object');
  }

  // Accept both `identifier` (preferred) and `email` (legacy) fields.
  const raw = body.identifier ?? body.email;
  const identifier = parseLoginIdentifier(requireString(raw, 'identifier'));
  const password = requireString(body.password, 'password');
  return { identifier, password };
}
