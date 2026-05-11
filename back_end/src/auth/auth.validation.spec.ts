import { validateRegisterBody } from './auth.validation';

describe('auth validation', () => {
  it('accepts register body with a valid birth date', () => {
    expect(
      validateRegisterBody({
        email: 'user@example.com',
        phoneNumber: '+84900000000',
        password: 'password123',
        fullName: 'Test User',
        nationality: 'VN',
        birthDate: '2000-02-29',
      }),
    ).toMatchObject({
      email: 'user@example.com',
      phoneNumber: '+84900000000',
      fullName: 'Test User',
      nationality: 'VN',
    });
  });

  it('rejects invalid calendar dates', () => {
    expect(() =>
      validateRegisterBody({
        email: 'user@example.com',
        phoneNumber: '+84900000000',
        password: 'password123',
        fullName: 'Test User',
        nationality: 'VN',
        birthDate: '2000-02-31',
      }),
    ).toThrow('birthDate must be a valid YYYY-MM-DD date');
  });
});
