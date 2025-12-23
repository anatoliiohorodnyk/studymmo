import { Module } from '@nestjs/common';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';
import { CharactersModule } from '../characters/characters.module';
import { ItemsModule } from '../items/items.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [CharactersModule, ItemsModule, InventoryModule],
  controllers: [StudyController],
  providers: [StudyService],
  exports: [StudyService],
})
export class StudyModule {}
