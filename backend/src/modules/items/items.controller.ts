import { Controller, Get, Param } from '@nestjs/common';
import { ItemsService } from './items.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('items')
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Public()
  @Get()
  async findAll() {
    return this.itemsService.findAll();
  }

  @Public()
  @Get('shop')
  async getShopItems() {
    return this.itemsService.getShopItems();
  }

  @Public()
  @Get('slot/:slot')
  async findBySlot(@Param('slot') slot: string) {
    return this.itemsService.findBySlot(slot);
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.itemsService.findById(id);
  }
}
