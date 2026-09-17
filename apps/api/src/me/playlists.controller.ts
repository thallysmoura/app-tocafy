import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { PlaylistsService } from './playlists.service';
import { CurrentUserId } from '../auth/current-user.decorator';

class CreatePlaylistDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

class ReorderDto {
  @IsInt()
  newIndex: number;
}

@UseGuards(AuthGuard('jwt'))
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlists: PlaylistsService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.playlists.listForUser(userId);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreatePlaylistDto) {
    return this.playlists.create(userId, dto.name, dto.isPublic ?? false);
  }

  @Get(':id')
  detail(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.playlists.getDetail(id, userId);
  }

  @Patch(':id')
  rename(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: CreatePlaylistDto,
  ) {
    return this.playlists.rename(id, userId, dto.name, dto.isPublic);
  }

  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.playlists.remove(id, userId);
  }

  @Post(':id/tracks/:trackId')
  addTrack(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('trackId') trackId: string,
  ) {
    return this.playlists.addTrack(id, userId, trackId);
  }

  @Delete(':id/tracks/:trackId')
  removeTrack(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('trackId') trackId: string,
  ) {
    return this.playlists.removeTrack(id, userId, trackId);
  }

  @Patch(':id/tracks/:trackId/position')
  reorder(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('trackId') trackId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.playlists.reorder(id, userId, trackId, dto.newIndex);
  }
}
