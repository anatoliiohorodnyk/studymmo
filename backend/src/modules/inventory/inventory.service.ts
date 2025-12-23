import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemsService } from '../items/items.service';
import { EquipmentSlot } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private itemsService: ItemsService,
  ) {}

  async getInventory(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        inventory: {
          include: { item: true },
        },
        equipment: {
          include: { item: true },
        },
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    return {
      inventory: character.inventory.map((inv) => ({
        id: inv.id,
        item: inv.item,
        quantity: inv.quantity,
      })),
      equipment: character.equipment.map((eq) => ({
        slot: eq.slot,
        item: eq.item,
      })),
    };
  }

  async equipItem(userId: string, inventoryItemId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        inventory: {
          include: { item: true },
        },
        equipment: {
          include: { item: true },
        },
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const inventoryItem = character.inventory.find((i) => i.id === inventoryItemId);
    if (!inventoryItem) {
      throw new NotFoundException('Item not found in inventory');
    }

    const slot = inventoryItem.item.slot;
    const currentEquipped = character.equipment.find((e) => e.slot === slot);

    await this.prisma.$transaction(async (tx) => {
      // Remove from inventory (decrease quantity or delete)
      if (inventoryItem.quantity > 1) {
        await tx.characterInventory.update({
          where: { id: inventoryItemId },
          data: { quantity: { decrement: 1 } },
        });
      } else {
        await tx.characterInventory.delete({
          where: { id: inventoryItemId },
        });
      }

      // If something is equipped, move it to inventory
      if (currentEquipped) {
        await tx.characterInventory.upsert({
          where: {
            characterId_itemId: {
              characterId: character.id,
              itemId: currentEquipped.itemId,
            },
          },
          create: {
            characterId: character.id,
            itemId: currentEquipped.itemId,
            quantity: 1,
          },
          update: {
            quantity: { increment: 1 },
          },
        });

        await tx.characterEquipment.delete({
          where: { id: currentEquipped.id },
        });
      }

      // Equip new item
      await tx.characterEquipment.create({
        data: {
          characterId: character.id,
          slot,
          itemId: inventoryItem.itemId,
        },
      });
    });

    return this.getInventory(userId);
  }

  async unequipItem(userId: string, slot: EquipmentSlot) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        equipment: {
          include: { item: true },
        },
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const equipped = character.equipment.find((e) => e.slot === slot);
    if (!equipped) {
      throw new BadRequestException('No item equipped in this slot');
    }

    await this.prisma.$transaction(async (tx) => {
      // Add to inventory
      await tx.characterInventory.upsert({
        where: {
          characterId_itemId: {
            characterId: character.id,
            itemId: equipped.itemId,
          },
        },
        create: {
          characterId: character.id,
          itemId: equipped.itemId,
          quantity: 1,
        },
        update: {
          quantity: { increment: 1 },
        },
      });

      // Remove from equipment
      await tx.characterEquipment.delete({
        where: { id: equipped.id },
      });
    });

    return this.getInventory(userId);
  }

  async buyFromNpc(userId: string, itemId: string, quantity: number = 1) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item || !item.npcBuyPrice) {
      throw new BadRequestException('Item cannot be bought from NPC');
    }

    const totalCost = item.npcBuyPrice * quantity;

    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    if (Number(character.cash) < totalCost) {
      throw new BadRequestException('Not enough cash');
    }

    await this.prisma.$transaction(async (tx) => {
      // Deduct cash
      await tx.character.update({
        where: { id: character.id },
        data: { cash: { decrement: totalCost } },
      });

      // Add to inventory
      await tx.characterInventory.upsert({
        where: {
          characterId_itemId: {
            characterId: character.id,
            itemId: item.id,
          },
        },
        create: {
          characterId: character.id,
          itemId: item.id,
          quantity,
        },
        update: {
          quantity: { increment: quantity },
        },
      });
    });

    return {
      success: true,
      itemName: item.name,
      quantity,
      totalCost,
    };
  }

  async sellToNpc(userId: string, inventoryItemId: string, quantity: number = 1) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        inventory: {
          include: { item: true },
        },
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const inventoryItem = character.inventory.find((i) => i.id === inventoryItemId);
    if (!inventoryItem) {
      throw new NotFoundException('Item not found in inventory');
    }

    if (inventoryItem.quantity < quantity) {
      throw new BadRequestException('Not enough items');
    }

    const totalValue = inventoryItem.item.npcSellPrice * quantity;

    await this.prisma.$transaction(async (tx) => {
      // Add cash
      await tx.character.update({
        where: { id: character.id },
        data: { cash: { increment: totalValue } },
      });

      // Remove from inventory
      if (inventoryItem.quantity === quantity) {
        await tx.characterInventory.delete({
          where: { id: inventoryItemId },
        });
      } else {
        await tx.characterInventory.update({
          where: { id: inventoryItemId },
          data: { quantity: { decrement: quantity } },
        });
      }
    });

    return {
      success: true,
      itemName: inventoryItem.item.name,
      quantity,
      totalValue,
    };
  }

  // Add item to character inventory (used by study drops, quests, etc.)
  async addItemToInventory(characterId: string, itemId: string, quantity: number = 1) {
    await this.prisma.characterInventory.upsert({
      where: {
        characterId_itemId: {
          characterId,
          itemId,
        },
      },
      create: {
        characterId,
        itemId,
        quantity,
      },
      update: {
        quantity: { increment: quantity },
      },
    });
  }
}
