import { Module } from '@nestjs/common';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ItemsModule } from '../items/items.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, ItemsModule, InventoryModule],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
