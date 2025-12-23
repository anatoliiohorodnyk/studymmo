import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemsService } from '../items/items.service';
import { InventoryService } from '../inventory/inventory.service';
import { GAME_CONFIG } from '../../config/game.config';
import { ItemRarity } from '@prisma/client';

@Injectable()
export class DailyRewardsService {
  constructor(
    private prisma: PrismaService,
    private itemsService: ItemsService,
    private inventoryService: InventoryService,
  ) {}

  async getStatus(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { dailyReward: true },
    });

    if (!character) {
      throw new BadRequestException('Character not found');
    }

    // Get or create daily reward record
    let dailyReward = character.dailyReward;
    if (!dailyReward) {
      dailyReward = await this.prisma.characterDailyReward.create({
        data: {
          characterId: character.id,
          currentDay: 1,
        },
      });
    }

    // Check if can claim today
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastClaimDate = dailyReward.lastClaim
      ? new Date(
          dailyReward.lastClaim.getFullYear(),
          dailyReward.lastClaim.getMonth(),
          dailyReward.lastClaim.getDate(),
        )
      : null;

    const canClaim = !lastClaimDate || lastClaimDate.getTime() < today.getTime();

    // Get today's reward config
    const todayReward = GAME_CONFIG.DAILY_REWARDS.find(
      (r) => r.day === dailyReward.currentDay,
    );

    // Build all rewards preview
    const allRewards = GAME_CONFIG.DAILY_REWARDS.map((r) => ({
      day: r.day,
      cash: r.cash || 0,
      itemRarity: 'item_rarity' in r ? (r.item_rarity as string) : null,
      questEnergy: 'quest_energy' in r ? (r.quest_energy as number) : null,
      isCurrent: r.day === dailyReward.currentDay,
      isClaimed: lastClaimDate
        ? r.day < dailyReward.currentDay ||
          (r.day === dailyReward.currentDay && !canClaim)
        : false,
    }));

    return {
      currentDay: dailyReward.currentDay,
      canClaim,
      lastClaim: dailyReward.lastClaim,
      todayReward: todayReward
        ? {
            day: todayReward.day,
            cash: todayReward.cash || 0,
            itemRarity:
              'item_rarity' in todayReward
                ? (todayReward.item_rarity as string)
                : null,
            questEnergy:
              'quest_energy' in todayReward
                ? (todayReward.quest_energy as number)
                : null,
          }
        : null,
      allRewards,
    };
  }

  async claim(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { dailyReward: true },
    });

    if (!character) {
      throw new BadRequestException('Character not found');
    }

    // Get or create daily reward record
    let dailyReward = character.dailyReward;
    if (!dailyReward) {
      dailyReward = await this.prisma.characterDailyReward.create({
        data: {
          characterId: character.id,
          currentDay: 1,
        },
      });
    }

    // Check if already claimed today
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastClaimDate = dailyReward.lastClaim
      ? new Date(
          dailyReward.lastClaim.getFullYear(),
          dailyReward.lastClaim.getMonth(),
          dailyReward.lastClaim.getDate(),
        )
      : null;

    if (lastClaimDate && lastClaimDate.getTime() >= today.getTime()) {
      throw new BadRequestException('Already claimed today');
    }

    // Get reward config for current day
    const rewardConfig = GAME_CONFIG.DAILY_REWARDS.find(
      (r) => r.day === dailyReward.currentDay,
    );

    if (!rewardConfig) {
      throw new BadRequestException('Invalid reward day');
    }

    // Prepare reward results
    const rewards: {
      cash: number;
      questEnergy: number;
      item: { id: string; name: string; rarity: string } | null;
    } = {
      cash: rewardConfig.cash || 0,
      questEnergy: 0,
      item: null,
    };

    // Apply cash reward
    if (rewards.cash > 0) {
      await this.prisma.character.update({
        where: { id: character.id },
        data: {
          cash: { increment: rewards.cash },
        },
      });
    }

    // Apply quest energy reward
    if ('quest_energy' in rewardConfig && rewardConfig.quest_energy) {
      rewards.questEnergy = rewardConfig.quest_energy;
      const newEnergy = Math.min(
        character.questEnergy + rewards.questEnergy,
        character.questEnergyMax,
      );
      await this.prisma.character.update({
        where: { id: character.id },
        data: { questEnergy: newEnergy },
      });
    }

    // Apply item reward
    if ('item_rarity' in rewardConfig && rewardConfig.item_rarity) {
      const rarity = rewardConfig.item_rarity as ItemRarity;
      const item = await this.itemsService.getRandomItemByRarity(rarity);
      if (item) {
        await this.inventoryService.addItemToInventory(character.id, item.id, 1);
        rewards.item = {
          id: item.id,
          name: item.name,
          rarity: item.rarity,
        };
      }
    }

    // Advance to next day (cycle 1-7)
    const nextDay = (dailyReward.currentDay % 7) + 1;

    // Update daily reward record
    await this.prisma.characterDailyReward.update({
      where: { id: dailyReward.id },
      data: {
        currentDay: nextDay,
        lastClaim: now,
      },
    });

    return {
      success: true,
      claimedDay: dailyReward.currentDay,
      nextDay,
      rewards,
    };
  }
}
