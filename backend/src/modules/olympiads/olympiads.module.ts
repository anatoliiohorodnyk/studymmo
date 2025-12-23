import { Module } from '@nestjs/common';
import { OlympiadsController } from './olympiads.controller';
import { OlympiadsService } from './olympiads.service';
import { OlympiadsScheduler } from './olympiads.scheduler';

@Module({
  controllers: [OlympiadsController],
  providers: [OlympiadsService, OlympiadsScheduler],
  exports: [OlympiadsService],
})
export class OlympiadsModule {}
