import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUserId } from './current-user.decorator';

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

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.auth.login(dto);
    this.setAuthCookies(res, accessToken, refreshToken, dto.remember ?? true);
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
}
