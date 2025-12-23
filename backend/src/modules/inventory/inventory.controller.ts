import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { EquipmentSlot } from '@prisma/client';

@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  async getInventory(@CurrentUser() user: JwtPayload) {
    return this.inventoryService.getInventory(user.sub as string);
  }

  @Post('equip/:inventoryItemId')
  async equipItem(
    @CurrentUser() user: JwtPayload,
    @Param('inventoryItemId') inventoryItemId: string,
  ) {
    return this.inventoryService.equipItem(user.sub as string, inventoryItemId);
  }

  @Post('unequip/:slot')
  async unequipItem(
    @CurrentUser() user: JwtPayload,
    @Param('slot') slot: EquipmentSlot,
  ) {
    return this.inventoryService.unequipItem(user.sub as string, slot);
  }

  @Post('buy')
  async buyFromNpc(
    @CurrentUser() user: JwtPayload,
    @Body() body: { itemId: string; quantity?: number },
  ) {
    return this.inventoryService.buyFromNpc(
      user.sub as string,
      body.itemId,
      body.quantity || 1,
    );
  }

  @Post('sell')
  async sellToNpc(
    @CurrentUser() user: JwtPayload,
    @Body() body: { inventoryItemId: string; quantity?: number },
  ) {
    return this.inventoryService.sellToNpc(
      user.sub as string,
      body.inventoryItemId,
      body.quantity || 1,
    );
  }
}
