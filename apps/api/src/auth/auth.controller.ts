import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { IsLatitude, IsLongitude, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUserId } from './current-user.decorator';

class GoogleLoginDto {
  @IsString()
  @MinLength(10)
  idToken: string;
}

class PingDto {
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * "Lembrar de mim" desmarcado = cookie de sessão (sem maxAge): some ao fechar
   * o navegador. Marcado = persiste 7 dias. O access token continua curto de
   * qualquer forma; quem importa aqui é o refresh token.
   */
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    remember = true,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      ...(remember ? { maxAge: 15 * 60 * 1000 } : {}),
      path: '/',
    });
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      ...(remember ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : {}),
      path: '/auth',
    });
  }

  private clientIp(req: Request): string | null {
    // Atrás do cloudflared, req.ip é o IP interno do container — o IP real
    // do visitante vem no header que a Cloudflare injeta.
    const cf = req.headers['cf-connecting-ip'];
    if (typeof cf === 'string' && cf) return cf;
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
    return req.ip ?? null;
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.auth.login(dto, {
      ip: this.clientIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
    this.setAuthCookies(res, accessToken, refreshToken, dto.remember ?? true);
    return { user };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('access-logs')
  async accessLogs(@CurrentUserId() userId: string) {
    return this.auth.accessLogs(userId);
  }

  // Disparado pelo front assim que o app abre e já reconhece a sessão (sem
  // passar pelo formulário de login) — registra o "retorno ao app" no log.
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('ping')
  async ping(@Body() dto: PingDto, @CurrentUserId() userId: string, @Req() req: Request) {
    await this.auth.pingAccess(userId, {
      ip: this.clientIp(req),
      userAgent: req.headers['user-agent'] ?? null,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
    return { ok: true };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('google')
  async loginWithGoogle(@Body() dto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.auth.loginWithGoogle(dto.idToken);
    this.setAuthCookies(res, accessToken, refreshToken, true);
    return { user };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) throw new UnauthorizedException('Sem refresh token');
    const { accessToken, refreshToken, user } = await this.auth.refresh(raw);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (raw) await this.auth.logout(raw);
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  async changePassword(
    @CurrentUserId() userId: string,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.auth.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    this.setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@CurrentUserId() userId: string) {
    return this.auth.me(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_BYTES } }))
  async uploadAvatar(
    @CurrentUserId() userId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException('Envie uma imagem no campo "file".');
    if (!ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Formato inválido. Use JPG, PNG ou WEBP.');
    }
    return this.auth.updateAvatar(userId, file.buffer, file.mimetype);
  }
}
