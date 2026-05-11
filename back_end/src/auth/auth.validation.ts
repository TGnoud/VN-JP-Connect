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

function requireNationality(value: string): Nationality {
  if (!(NATIONALITIES as readonly string[]).includes(value)) {
    throw new BadRequestException(`nationality must be one of: ${NATIONALITIES.join(', ')}`);
  }
  return value as Nationality;
}

export type RegisterInput = {
  email: string;
  phoneNumber: string;
  password: string;
  fullName: string;
  nationality: Nationality;
};

export function validateRegisterBody(body: unknown): RegisterInput {
  if (!isRecord(body)) {
    throw new BadRequestException('body must be an object');
  }

  const email = requireEmail(requireString(body.email, 'email').toLowerCase());
  const phoneNumber = requireString(body.phoneNumber, 'phoneNumber');
  const password = requireString(body.password, 'password');
  if (password.length < 6) {
    throw new BadRequestException('password must be at least 6 characters');
  }
  const fullName = requireString(body.fullName, 'fullName');
  const nationality = requireNationality(requireString(body.nationality, 'nationality'));

  return { email, phoneNumber, password, fullName, nationality };
}

export type LoginInput = {
  email: string;
  password: string;
};

export function validateLoginBody(body: unknown): LoginInput {
  if (!isRecord(body)) {
    throw new BadRequestException('body must be an object');
  }

  const email = requireEmail(requireString(body.email, 'email').toLowerCase());
  const password = requireString(body.password, 'password');
  return { email, password };
}

