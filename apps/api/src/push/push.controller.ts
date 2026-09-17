import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PushService } from './push.service';
import { CurrentUserId } from '../auth/current-user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('subscribe')
  subscribe(
    @CurrentUserId() userId: string,
    @Body() sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.push.subscribe(userId, sub);
  }

  @Delete('subscribe')
  unsubscribe(@Body('endpoint') endpoint: string) {
    return this.push.unsubscribe(endpoint);
  }
}
