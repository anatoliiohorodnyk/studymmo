import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemsService } from '../items/items.service';
import { InventoryService } from '../inventory/inventory.service';
import { GAME_CONFIG } from '../../config/game.config';
import { randomInt, calculateSubjectXpToNextLevel } from '../../common/utils/formulas';

interface QuestRewards {
  cashMin: number;
  cashMax: number;
  subjectXpMin: number;
  subjectXpMax: number;
  itemChance: number;
}

@Injectable()
export class QuestsService {
  constructor(
    private prisma: PrismaService,
    private itemsService: ItemsService,
    private inventoryService: InventoryService,
  ) {}

  async getAvailableQuests(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        subjects: true,
        questCooldowns: true,
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    // Calculate current energy
    const energy = this.calculateCurrentEnergy(
      character.questEnergy,
      character.questEnergyLastRegen,
      character.questEnergyMax,
    );

    const quests = await this.prisma.quest.findMany({
      where: {
        requiredCharacterLevel: { lte: character.level },
      },
      orderBy: { energyCost: 'asc' },
    });

    const cooldownMap = new Map(
      character.questCooldowns.map((cd) => [cd.questId, cd.availableAt]),
    );

    const avgSubjectLevel =
      character.subjects.reduce((sum, s) => sum + s.level, 0) /
      (character.subjects.length || 1);

    const now = new Date();

    return {
      currentEnergy: energy.energy,
      maxEnergy: character.questEnergyMax,
      energyRegenMinutes: GAME_CONFIG.QUEST_ENERGY_REGEN_MINUTES,
      quests: quests.map((quest) => {
        const cooldownUntil = cooldownMap.get(quest.id);
        const isOnCooldown = cooldownUntil && cooldownUntil > now;
        const meetsRequirements = avgSubjectLevel >= quest.requiredSubjectLevel;

        return {
          id: quest.id,
          name: quest.name,
          description: quest.description,
          type: quest.type,
          energyCost: quest.energyCost,
          cooldownSeconds: quest.cooldownSeconds,
          rewards: quest.rewards,
          requiredCharacterLevel: quest.requiredCharacterLevel,
          requiredSubjectLevel: quest.requiredSubjectLevel,
          isOnCooldown,
          cooldownUntil: isOnCooldown ? cooldownUntil : null,
          canStart: !isOnCooldown && meetsRequirements && energy.energy >= quest.energyCost,
          meetsRequirements,
        };
      }),
    };
  }

  async startQuest(userId: string, questId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        subjects: {
          include: { subject: true },
        },
        questCooldowns: true,
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const quest = await this.prisma.quest.findUnique({
      where: { id: questId },
    });

    if (!quest) {
      throw new NotFoundException('Quest not found');
    }

    // Check level requirement
    if (character.level < quest.requiredCharacterLevel) {
      throw new BadRequestException('Character level too low');
    }

    // Check subject level requirement
    const avgSubjectLevel =
      character.subjects.reduce((sum, s) => sum + s.level, 0) /
      (character.subjects.length || 1);
    if (avgSubjectLevel < quest.requiredSubjectLevel) {
      throw new BadRequestException('Subject levels too low');
    }

    // Calculate current energy
    const energyResult = this.calculateCurrentEnergy(
      character.questEnergy,
      character.questEnergyLastRegen,
      character.questEnergyMax,
    );

    if (energyResult.energy < quest.energyCost) {
      throw new BadRequestException('Not enough energy');
    }

    // Check cooldown
    const existingCooldown = character.questCooldowns.find(
      (cd) => cd.questId === questId,
    );
    if (existingCooldown && existingCooldown.availableAt > new Date()) {
      throw new BadRequestException('Quest is on cooldown');
    }

    // Parse rewards
    const rewards = quest.rewards as unknown as QuestRewards;

    // Calculate rewards
    const cashEarned = randomInt(rewards.cashMin, rewards.cashMax);

    // Random subject XP
    const randomSubject =
      character.subjects[Math.floor(Math.random() * character.subjects.length)];
    const subjectXpGained = randomInt(rewards.subjectXpMin, rewards.subjectXpMax);

    let newSubjectXp = randomSubject.currentXp + subjectXpGained;
    let newSubjectLevel = randomSubject.level;
    let subjectLeveledUp = false;

    let xpToNext = calculateSubjectXpToNextLevel(newSubjectLevel);
    while (newSubjectXp >= xpToNext) {
      newSubjectXp -= xpToNext;
      newSubjectLevel++;
      subjectLeveledUp = true;
      xpToNext = calculateSubjectXpToNextLevel(newSubjectLevel);
    }

    // Item drop
    let itemDrop: { itemId: string; itemName: string; rarity: string } | null = null;
    if (Math.random() < rewards.itemChance) {
      const rarityResult = this.itemsService.generateRandomItem();
      if (rarityResult) {
        const droppedItem = await this.itemsService.getRandomItemByRarity(rarityResult.rarity);
        if (droppedItem) {
          await this.inventoryService.addItemToInventory(character.id, droppedItem.id, 1);
          itemDrop = {
            itemId: droppedItem.id,
            itemName: droppedItem.name,
            rarity: droppedItem.rarity,
          };
        }
      }
    }

    // Calculate new energy
    const newEnergy = energyResult.energy - quest.energyCost;
    const now = new Date();
    const cooldownUntil = new Date(now.getTime() + quest.cooldownSeconds * 1000);

    // Execute updates
    await this.prisma.$transaction([
      // Update character energy and cash
      this.prisma.character.update({
        where: { id: character.id },
        data: {
          questEnergy: newEnergy,
          questEnergyLastRegen: energyResult.lastRegen,
          cash: { increment: cashEarned },
        },
      }),
      // Update subject XP
      this.prisma.characterSubject.update({
        where: { id: randomSubject.id },
        data: {
          currentXp: newSubjectXp,
          level: newSubjectLevel,
        },
      }),
      // Set cooldown
      this.prisma.characterQuestCooldown.upsert({
        where: {
          characterId_questId: {
            characterId: character.id,
            questId: quest.id,
          },
        },
        create: {
          characterId: character.id,
          questId: quest.id,
          availableAt: cooldownUntil,
        },
        update: {
          availableAt: cooldownUntil,
        },
      }),
    ]);

    return {
      success: true,
      questName: quest.name,
      cashEarned,
      subjectXpGained: {
        subjectId: randomSubject.subject.id,
        subjectName: randomSubject.subject.name,
        xpGained: subjectXpGained,
        newLevel: newSubjectLevel,
        leveledUp: subjectLeveledUp,
      },
      itemDrop,
      newEnergy,
      cooldownUntil,
    };
  }

  private calculateCurrentEnergy(
    storedEnergy: number,
    lastRegen: Date,
    maxEnergy: number,
  ): { energy: number; lastRegen: Date } {
    const now = new Date();
    const minutesPassed = (now.getTime() - lastRegen.getTime()) / (1000 * 60);
    const energyGained = Math.floor(minutesPassed / GAME_CONFIG.QUEST_ENERGY_REGEN_MINUTES);

    if (energyGained > 0) {
      const newEnergy = Math.min(storedEnergy + energyGained, maxEnergy);
      const regenUsed = energyGained * GAME_CONFIG.QUEST_ENERGY_REGEN_MINUTES;
      const newLastRegen = new Date(lastRegen.getTime() + regenUsed * 60 * 1000);
      return { energy: newEnergy, lastRegen: newLastRegen };
    }

    return { energy: storedEnergy, lastRegen };
  }
}
