import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { R2Service } from './r2.service';

const BYTES_PER_GB = 1024 ** 3;

@UseGuards(AuthGuard('jwt'))
@Controller('storage')
export class StorageController {
  constructor(
    private readonly r2: R2Service,
    private readonly config: ConfigService,
  ) {}

  @Get('usage')
  async usage() {
    const { bytes, objectCount } = await this.r2.getUsage();
    // Cloudflare R2, plano gratuito: 10 GB-mês de armazenamento (egress é sempre
    // grátis, então o que importa aqui pro usuário é só o espaço ocupado).
    const freeTierGb = Number(this.config.get<string>('R2_FREE_TIER_GB') ?? 10);
    const limitBytes = freeTierGb * BYTES_PER_GB;
    return {
      bytes,
      objectCount,
      limitBytes,
      percentUsed: limitBytes > 0 ? Math.min(100, (bytes / limitBytes) * 100) : 0,
    };
  }
}
