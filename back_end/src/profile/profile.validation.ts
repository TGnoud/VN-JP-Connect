import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  MAX_BIO_LENGTH,
  PROFILE_GENDER_OPTIONS,
  PROFILE_LANGUAGE_LEVEL_OPTIONS,
  PROFILE_LANGUAGE_OPTIONS,
  PROFILE_NATIONALITY_OPTIONS,
} from './profile.constants';

export interface PersonalProfileInput {
  fullName?: string;
  email?: string;
  gender?: string;
  nationality?: string;
  location?: string;
  occupation?: string;
  education?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    line?: string;
  };
}

export interface LanguageInput {
  language: string;
  level: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, fieldName: string) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(`${fieldName} must be a string`);
  }

  return value.trim();
}

export function assertObjectBody(body: unknown) {
  if (!isPlainObject(body)) {
    throw new BadRequestException('Request body must be an object');
  }

  return body;
}

export function validateBioBody(body: unknown) {
  const payload = assertObjectBody(body);
  const bio = optionalString(payload.bio, 'bio') ?? '';

  if (bio.length > MAX_BIO_LENGTH) {
    throw new BadRequestException(`bio must be at most ${MAX_BIO_LENGTH} characters`);
  }

  return { bio };
}

export function validatePersonalBody(body: unknown): PersonalProfileInput {
  const payload = assertObjectBody(body);
  const socialLinks = isPlainObject(payload.socialLinks) ? payload.socialLinks : {};
  const input: PersonalProfileInput = {
    fullName: optionalString(payload.fullName, 'fullName'),
    email: optionalString(payload.email, 'email'),
    gender: optionalString(payload.gender, 'gender'),
    nationality: optionalString(payload.nationality, 'nationality'),
    location: optionalString(payload.location, 'location'),
    occupation: optionalString(payload.occupation, 'occupation'),
    education: optionalString(payload.education, 'education'),
    socialLinks: {
      instagram: optionalString(socialLinks.instagram, 'socialLinks.instagram'),
      facebook: optionalString(socialLinks.facebook, 'socialLinks.facebook'),
      line: optionalString(socialLinks.line, 'socialLinks.line'),
    },
  };

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new BadRequestException('email must be valid');
  }

  if (input.gender && !PROFILE_GENDER_OPTIONS.includes(input.gender as never)) {
    throw new BadRequestException('gender is not supported');
  }

  if (
    input.nationality &&
    !PROFILE_NATIONALITY_OPTIONS.includes(input.nationality as never)
  ) {
    throw new BadRequestException('nationality is not supported');
  }

  return input;
}

export function validateLanguagesBody(body: unknown) {
  const payload = assertObjectBody(body);

  if (!Array.isArray(payload.languages)) {
    throw new BadRequestException('languages must be an array');
  }

  const seen = new Set<string>();

  return payload.languages.map((item, index): LanguageInput => {
    if (!isPlainObject(item)) {
      throw new BadRequestException(`languages[${index}] must be an object`);
    }

    const language = optionalString(item.language, `languages[${index}].language`);
    const level = optionalString(item.level, `languages[${index}].level`);

    if (!language || !level) {
      throw new BadRequestException('language and level are required');
    }

    if (!PROFILE_LANGUAGE_OPTIONS.includes(language as never)) {
      throw new BadRequestException(`language "${language}" is not supported`);
    }

    if (!PROFILE_LANGUAGE_LEVEL_OPTIONS.includes(level as never)) {
      throw new BadRequestException(`level "${level}" is not supported`);
    }

    const key = language.toLowerCase();

    if (seen.has(key)) {
      throw new BadRequestException(`language "${language}" is duplicated`);
    }

    seen.add(key);
    return { language, level };
  });
}

export function validateInterestBody(body: unknown) {
  const payload = assertObjectBody(body);

  if (!Array.isArray(payload.tagIds)) {
    throw new BadRequestException('tagIds must be an array');
  }

  const uniqueTagIds = [...new Set(payload.tagIds)];

  for (const tagId of uniqueTagIds) {
    if (typeof tagId !== 'string' || !Types.ObjectId.isValid(tagId)) {
      throw new BadRequestException('tagIds must contain valid ObjectId strings');
    }
  }

  return uniqueTagIds;
}

export function validateImageUrlBody(body: unknown) {
  const payload = assertObjectBody(body);
  const url = optionalString(payload.url, 'url');

  if (!url) {
    throw new BadRequestException('url is required');
  }

  const isPublicUrl = /^https?:\/\/\S+$/i.test(url);
  const isLocalUploadUrl = url.startsWith('/uploads/profile/');

  if (!isPublicUrl && !isLocalUploadUrl) {
    throw new BadRequestException('url must be an http(s) URL or local upload path');
  }

  return { url };
}

export function validateImageUrlsBody(body: unknown) {
  const payload = assertObjectBody(body);

  if (!Array.isArray(payload.urls)) {
    throw new BadRequestException('urls must be an array');
  }

  const urls = [...new Set(payload.urls)];

  for (const url of urls) {
    if (typeof url !== 'string') {
      throw new BadRequestException('urls must contain strings');
    }

    validateImageUrlBody({ url });
  }

  return { urls };
}
