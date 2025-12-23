import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemRarity } from '@prisma/client';
import { GAME_CONFIG } from '../../config/game.config';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.item.findMany({
      orderBy: [{ slot: 'asc' }, { rarity: 'asc' }],
    });
  }

  async findBySlot(slot: string) {
    return this.prisma.item.findMany({
      where: { slot: slot as any },
      orderBy: { rarity: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.item.findUnique({
      where: { id },
    });
  }

  async getShopItems() {
    // Only items that can be bought from NPC (have npcBuyPrice)
    return this.prisma.item.findMany({
      where: {
        npcBuyPrice: { not: null },
      },
      orderBy: [{ slot: 'asc' }, { npcBuyPrice: 'asc' }],
    });
  }

  // Generate random item based on rarity weights
  generateRandomItem(): { rarity: ItemRarity } | null {
    const weights = GAME_CONFIG.RARITY_WEIGHTS;
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const random = Math.random() * totalWeight;

    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (random <= cumulative) {
        return { rarity: rarity as ItemRarity };
      }
    }

    return { rarity: ItemRarity.common };
  }

  async getRandomItemByRarity(rarity: ItemRarity) {
    const items = await this.prisma.item.findMany({
      where: { rarity },
    });

    if (items.length === 0) return null;

    return items[Math.floor(Math.random() * items.length)];
  }
}
