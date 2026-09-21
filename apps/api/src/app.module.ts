import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TracksModule } from './tracks/tracks.module';
import { CatalogModule } from './catalog/catalog.module';
import { LibraryModule } from './library/library.module';
import { PushModule } from './push/push.module';
import { MeModule } from './me/me.module';
import { HealthModule } from './health/health.module';
import { StorageModule } from './storage/storage.module';
import { RecognizeModule } from './recognize/recognize.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    StorageModule,
    PrismaModule,
    AuthModule,
    MeModule,
    TracksModule,
    CatalogModule,
    LibraryModule,
    PushModule,
    HealthModule,
    RecognizeModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
