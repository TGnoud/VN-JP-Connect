import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { hashPassword } from './password';

function queryMock<T>(value: T) {
  return {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('AuthService', () => {
  it('rejects login for frozen users', async () => {
    const service = new AuthService(
      {
        findOne: jest.fn().mockReturnValue(
          queryMock({
            _id: 'user-id',
            email: 'frozen@example.com',
            phone_number: '0900000000',
            password_hash: hashPassword('Password123!'),
            status: 'frozen',
          }),
        ),
      } as any,
      {} as any,
    );

    await expect(
      service.login({
        identifier: {
          type: 'email',
          value: 'frozen@example.com',
        },
        password: 'Password123!',
      }),
    ).rejects.toThrow(new UnauthorizedException('account is frozen'));
  });
});
