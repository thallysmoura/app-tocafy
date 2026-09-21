import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { cert, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../storage/r2.service';
import { LoginDto } from './dto/login.dto';
import { AccessLogService } from './access-log.service';

type LoginContext = { ip: string | null; userAgent: string | null };

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

let firebaseApp: App | null | undefined; // undefined = ainda não tentou, null = tentou e não achou a credencial

function getFirebaseApp(): App | null {
  if (firebaseApp !== undefined) return firebaseApp;
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.join(process.cwd(), 'firebase-service-account.json');
  if (!fs.existsSync(keyPath)) {
    firebaseApp = null;
    return null;
  }
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  firebaseApp = initializeApp({ credential: cert(serviceAccount) });
  return firebaseApp;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly r2: R2Service,
    private readonly accessLog: AccessLogService,
  ) {}

  async login(dto: LoginDto, ctx: LoginContext) {
    const email = dto.email.toLowerCase();

    const failedCount = await this.accessLog.recentFailedCount(email);
    if (this.accessLog.isLockedOut(failedCount)) {
      throw new ForbiddenException('Muitas tentativas de login. Tente novamente em alguns minutos.');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;

    if (!user || !valid) {
      await this.accessLog.record({
        email,
        success: false,
        userId: user?.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        latitude: dto.latitude,
        longitude: dto.longitude,
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.accessLog.record({
      email,
      success: true,
      userId: user.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    return this.issueTokens(user.id);
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.issueTokens(stored.userId);
  }

  async logout(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    await this.prisma.refreshToken
      .update({ where: { tokenHash }, data: { revoked: true } })
      .catch(() => undefined);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Senha atual incorreta');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      }),
    ]);

    return this.issueTokens(userId);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    // Avatar enviado manualmente (R2) tem prioridade sobre a foto do Google —
    // se o usuário trocou a própria foto, não queremos que o próximo login
    // com Google sobrescreva a escolha dele.
    const avatarUrl =
      user.avatarKey && this.r2.isEnabled
        ? await this.r2.getSignedStreamUrl(user.avatarKey)
        : user.googleAvatarUrl;
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      mustChangePassword: user.mustChangePassword,
      isAdmin: user.isAdmin,
      avatarUrl,
      createdAt: user.createdAt,
    };
  }

  async updateAvatar(userId: string, buffer: Buffer, contentType: string) {
    if (!this.r2.isEnabled) {
      throw new BadRequestException('Upload de foto indisponível no momento.');
    }
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const key = `avatars/${userId}.${ext}`;
    await this.r2.uploadBuffer(key, buffer, contentType);
    await this.prisma.user.update({ where: { id: userId }, data: { avatarKey: key } });
    return this.me(userId);
  }

  async loginWithGoogle(idToken: string) {
    const app = getFirebaseApp();
    if (!app) throw new BadRequestException('Login com Google não configurado no servidor.');

    let decoded: DecodedIdToken;
    try {
      decoded = await getAuth(app).verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Token do Google inválido.');
    }
    if (!decoded.email) throw new UnauthorizedException('Conta Google sem e-mail.');

    const email = decoded.email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Conta só-Google não usa senha própria — gera um hash aleatório
      // inutilizável só pra satisfazer a coluna NOT NULL do schema.
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName: decoded.name || email.split('@')[0],
          mustChangePassword: false,
          googleAvatarUrl: decoded.picture ?? null,
        },
      });
    } else if (decoded.picture && decoded.picture !== user.googleAvatarUrl) {
      // Mantém a URL da foto do Google sempre atualizada a cada login (caso o
      // usuário troque a foto lá) — usada direto, sem re-hospedar no R2.
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleAvatarUrl: decoded.picture },
      });
    }

    return this.issueTokens(user.id);
  }

  accessLogs(userId: string) {
    return this.accessLog.list(userId);
  }

  // Chamado quando o app abre e o usuário JÁ está autenticado (cookie de
  // sessão válido) — não passou pela tela de login agora, mas é um retorno
  // real ao app e vale registrar localização/dispositivo igual a um login.
  async pingAccess(userId: string, ctx: LoginContext & { latitude?: number; longitude?: number }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await this.accessLog.record({
      email: user.email,
      success: true,
      userId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      latitude: ctx.latitude,
      longitude: ctx.longitude,
      type: 'resume',
    });
  }

  private async issueTokens(userId: string) {
    const accessToken = this.jwt.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      },
    );

    const rawRefreshToken = crypto.randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    const user = await this.me(userId);
    return { accessToken, refreshToken: rawRefreshToken, user };
  }
}
