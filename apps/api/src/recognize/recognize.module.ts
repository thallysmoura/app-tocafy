import { Module } from '@nestjs/common';
import { RecognizeController } from './recognize.controller';
import { RecognizeService } from './recognize.service';

@Module({
  controllers: [RecognizeController],
  providers: [RecognizeService],
})
export class RecognizeModule {}
