import { Module } from '@nestjs/common';
import { DailyRewardsController } from './daily-rewards.controller';
import { DailyRewardsService } from './daily-rewards.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ItemsModule } from '../items/items.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, ItemsModule, InventoryModule],
  controllers: [DailyRewardsController],
  providers: [DailyRewardsService],
  exports: [DailyRewardsService],
})
export class DailyRewardsModule {}
