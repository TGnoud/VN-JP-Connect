import {
  validateBioBody,
  validateInterestBody,
  validateLanguagesBody,
  validatePersonalBody,
} from './profile.validation';

describe('profile validation', () => {
  it('accepts valid personal profile fields', () => {
    expect(
      validatePersonalBody({
        fullName: 'Nguyen Van Minh',
        email: 'minh@example.com',
        age: '26',
        gender: 'male',
        nationality: 'VN',
        socialLinks: { instagram: '@minh' },
      }),
    ).toMatchObject({
      fullName: 'Nguyen Van Minh',
      email: 'minh@example.com',
      age: 26,
      gender: 'male',
      nationality: 'VN',
    });
  });

  it('rejects invalid personal fields', () => {
    expect(() => validatePersonalBody({ email: 'invalid' })).toThrow(
      'email must be valid',
    );
    expect(() => validatePersonalBody({ gender: 'unknown' })).toThrow(
      'gender is not supported',
    );
  });

  it('enforces bio length', () => {
    expect(validateBioBody({ bio: 'hello' })).toEqual({ bio: 'hello' });
    expect(() => validateBioBody({ bio: 'a'.repeat(301) })).toThrow(
      'bio must be at most 300 characters',
    );
  });

  it('rejects duplicate language skills', () => {
    expect(() =>
      validateLanguagesBody({
        languages: [
          { language: 'Japanese', level: 'N3' },
          { language: 'Japanese', level: 'N2' },
        ],
      }),
    ).toThrow('language "Japanese" is duplicated');
  });

  it('accepts only ObjectId interest IDs', () => {
    expect(() => validateInterestBody({ tagIds: ['not-an-id'] })).toThrow(
      'tagIds must contain valid ObjectId strings',
    );
  });
});
