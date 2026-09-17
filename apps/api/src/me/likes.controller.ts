import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LikesService } from './likes.service';
import { CurrentUserId } from '../auth/current-user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('me')
export class LikesController {
  constructor(private readonly likes: LikesService) {}

  @Get('likes')
  list(@CurrentUserId() userId: string) {
    return this.likes.list(userId);
  }

  @Post('likes/:trackId')
  like(@CurrentUserId() userId: string, @Param('trackId') trackId: string) {
    return this.likes.like(userId, trackId);
  }

  @Delete('likes/:trackId')
  unlike(@CurrentUserId() userId: string, @Param('trackId') trackId: string) {
    return this.likes.unlike(userId, trackId);
  }

  @Get('history')
  history(@CurrentUserId() userId: string) {
    return this.likes.history(userId);
  }
}
