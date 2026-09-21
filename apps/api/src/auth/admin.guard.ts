import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Usa DEPOIS de AuthGuard('jwt') — recursos de servidor compartilhado (ex.:
 * rescanear a pasta de música local) só o admin pode acionar. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.userId;
    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;
    if (!user?.isAdmin) throw new ForbiddenException('Só o admin pode fazer isso.');
    return true;
  }
}
