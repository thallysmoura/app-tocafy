import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../src/auth/auth.service';

jest.mock('bcrypt');

function buildPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  } as any;
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: AuthService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    const jwt = new JwtService({});
    jest.spyOn(jwt, 'sign').mockReturnValue('signed.jwt.token');
    const config = new ConfigService({
      JWT_ACCESS_SECRET: 'secret',
      JWT_ACCESS_TTL: '15m',
    });
    service = new AuthService(prisma, jwt, config);
  });

  it('faz login e emite tokens com credenciais corretas', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: 'hashed' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'u1',
      email: 'a@a.com',
      displayName: 'A',
      mustChangePassword: false,
    });

    const result = await service.login({ email: 'a@a.com', password: 'certa' });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.refreshToken).toEqual(expect.any(String));
  });

  it('rejeita login com senha incorreta', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash: 'hashed' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'a@a.com', password: 'errada' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revoga refresh tokens ao trocar senha', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'u1',
      passwordHash: 'hashed',
      email: 'a@a.com',
      displayName: 'A',
      mustChangePassword: true,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('novo-hash');
    prisma.user.update.mockResolvedValue({});
    prisma.refreshToken.updateMany.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});

    await service.changePassword('u1', 'senha-atual', 'senha-nova-123');

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revoked: false },
      data: { revoked: true },
    });
  });
});
