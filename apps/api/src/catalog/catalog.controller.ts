import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CatalogService } from './catalog.service';
import { CurrentUserId } from '../auth/current-user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('artists')
  listArtists(@CurrentUserId() userId: string) {
    return this.catalog.listArtists(userId);
  }

  @Get('artists/:id')
  getArtist(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.catalog.getArtist(id, userId);
  }

  @Get('albums/:id')
  getAlbum(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.catalog.getAlbum(id, userId);
  }
}
