import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AudiusService } from './audius.service';

@UseGuards(AuthGuard('jwt'))
@Controller('audius')
export class AudiusController {
  constructor(private readonly audius: AudiusService) {}

  @Get('search')
  search(@Query('q') q = '') {
    return this.audius.search(q);
  }

  @Get('tracks/:id/stream')
  async stream(@Param('id') id: string, @Res() res: Response) {
    const url = await this.audius.getStreamUrl(id);
    res.redirect(302, url);
  }
}
