import { Module } from '@nestjs/common';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { PlaylistsService } from './playlists.service';
import { PlaylistsController } from './playlists.controller';

@Module({
  controllers: [LikesController, PlaylistsController],
  providers: [LikesService, PlaylistsService],
  exports: [LikesService, PlaylistsService],
})
export class MeModule {}
