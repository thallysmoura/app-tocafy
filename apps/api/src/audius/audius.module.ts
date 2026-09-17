import { Module } from '@nestjs/common';
import { AudiusService } from './audius.service';
import { AudiusController } from './audius.controller';

@Module({
  controllers: [AudiusController],
  providers: [AudiusService],
})
export class AudiusModule {}
