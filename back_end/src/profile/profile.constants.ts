export const PROFILE_GENDER_OPTIONS = ['male', 'female', 'other'] as const;
export const PROFILE_NATIONALITY_OPTIONS = ['JP', 'VN'] as const;
export const PROFILE_LOCATION_OPTIONS = [
  'Ha Noi, Viet Nam',
  'Ho Chi Minh City, Viet Nam',
  'Da Nang, Viet Nam',
  'Tokyo, Japan',
  'Osaka, Japan',
  'Other',
] as const;
export const PROFILE_LANGUAGE_OPTIONS = [
  'Vietnamese',
  'Japanese',
  'English',
  'Chinese',
  'Korean',
  'French',
  'Spanish',
] as const;
export const PROFILE_LANGUAGE_LEVEL_OPTIONS = [
  'Native',
  'Beginner',
  'Intermediate',
  'Advanced',
  'N1',
  'N2',
  'N3',
  'N4',
  'N5',
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
  'IELTS 6.5',
  'IELTS 7.0',
] as const;

export const MAX_BIO_LENGTH = 300;
export const MAX_PROFILE_PHOTOS = 9;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png'];
export const COVER_MIME_TYPES = ['image/jpeg', 'image/png'];
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
