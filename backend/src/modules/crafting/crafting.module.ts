import { Module } from '@nestjs/common';
import { CraftingController } from './crafting.controller';
import { CraftingService } from './crafting.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CraftingController],
  providers: [CraftingService],
  exports: [CraftingService],
})
export class CraftingModule {}
