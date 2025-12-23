import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GAME_CONFIG } from '../../config/game.config';
import { calculateEnergyRegen } from '../../common/utils/formulas';
import { OlympiadDifficulty } from '@prisma/client';

export interface OlympiadBattleResult {
  won: boolean;
  playerScore: number;
  npcScore: number;
  npcLevel: number;
  rewards: {
    cash: number;
    xp: number;
    itemDrop?: {
      itemId: string;
      itemName: string;
      rarity: string;
    };
  } | null;
  newOlympiadEnergy: number;
}

@Injectable()
export class OlympiadsService {
  constructor(private prisma: PrismaService) {}

  async getOlympiads(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { subjects: true },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    // Calculate current energy
    const energyResult = calculateEnergyRegen(
      character.olympiadEnergyLastRegen,
      character.olympiadEnergy,
      character.olympiadEnergyMax,
      GAME_CONFIG.OLYMPIAD_ENERGY_REGEN_MINUTES,
    );

    // Update energy if changed
    if (energyResult.energy !== character.olympiadEnergy) {
      await this.prisma.character.update({
        where: { id: character.id },
        data: {
          olympiadEnergy: energyResult.energy,
          olympiadEnergyLastRegen: energyResult.lastRegen,
        },
      });
    }

    // Get all olympiad types
    const olympiadTypes = await this.prisma.olympiadType.findMany({
      include: { subject: true },
      orderBy: [{ difficulty: 'asc' }, { name: 'asc' }],
    });

    // Check which olympiads are available
    const olympiads = olympiadTypes.map((ot) => {
      const isUnlocked = character.level >= ot.requiredCharacterLevel;
      const canAfford = energyResult.energy >= ot.energyCost;

      return {
        id: ot.id,
        name: ot.name,
        difficulty: ot.difficulty,
        subject: ot.subject
          ? { id: ot.subject.id, name: ot.subject.name }
          : null,
        energyCost: ot.energyCost,
        requiredLevel: ot.requiredCharacterLevel,
        isUnlocked,
        canAfford,
        rewards: ot.rewards,
      };
    });

    return {
      olympiadEnergy: energyResult.energy,
      olympiadEnergyMax: character.olympiadEnergyMax,
      olympiads,
    };
  }

  async battle(userId: string, olympiadId: string): Promise<OlympiadBattleResult> {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        subjects: { include: { subject: true } },
        equipment: { include: { item: true } },
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const olympiad = await this.prisma.olympiadType.findUnique({
      where: { id: olympiadId },
      include: { subject: true },
    });

    if (!olympiad) {
      throw new NotFoundException('Olympiad not found');
    }

    // Check level requirement
    if (character.level < olympiad.requiredCharacterLevel) {
      throw new BadRequestException(
        `Requires character level ${olympiad.requiredCharacterLevel}`,
      );
    }

    // Calculate current energy
    const energyResult = calculateEnergyRegen(
      character.olympiadEnergyLastRegen,
      character.olympiadEnergy,
      character.olympiadEnergyMax,
      GAME_CONFIG.OLYMPIAD_ENERGY_REGEN_MINUTES,
    );

    if (energyResult.energy < olympiad.energyCost) {
      throw new BadRequestException('Not enough olympiad energy');
    }

    // Generate NPC level based on olympiad difficulty
    const npcLevelRange = olympiad.npcLevelRange as { min: number; max: number };
    const npcLevel =
      Math.floor(Math.random() * (npcLevelRange.max - npcLevelRange.min + 1)) +
      npcLevelRange.min;

    // Calculate player's effective level for this olympiad
    let playerEffectiveLevel = character.level;

    // If olympiad has a specific subject, use that subject's level
    if (olympiad.subjectId) {
      const charSubject = character.subjects.find(
        (cs) => cs.subjectId === olympiad.subjectId,
      );
      if (charSubject) {
        // Average of character level and subject level
        playerEffectiveLevel = Math.floor(
          (character.level + charSubject.level) / 2,
        );
      }
    } else {
      // General olympiad: average of all subject levels
      const avgSubjectLevel =
        character.subjects.reduce((sum, cs) => sum + cs.level, 0) /
        character.subjects.length;
      playerEffectiveLevel = Math.floor(
        (character.level + avgSubjectLevel) / 2,
      );
    }

    // Calculate equipment bonus
    let equipmentBonus = 0;
    for (const eq of character.equipment) {
      const stats = eq.item.stats as Record<string, number>;
      equipmentBonus += stats.grade_bonus || 0; // Use grade bonus as olympiad bonus
    }

    // Battle calculation
    // Player score: base from level + random factor + equipment bonus
    const playerBase = playerEffectiveLevel * 10;
    const playerRandom = Math.floor(Math.random() * 30) - 15; // -15 to +15
    const playerScore = Math.max(0, playerBase + playerRandom + equipmentBonus);

    // NPC score: base from level + random factor
    const npcBase = npcLevel * 10;
    const npcRandom = Math.floor(Math.random() * 30) - 15;
    const npcScore = Math.max(0, npcBase + npcRandom);

    const won = playerScore > npcScore;

    // Deduct energy
    const newEnergy = energyResult.energy - olympiad.energyCost;
    await this.prisma.character.update({
      where: { id: character.id },
      data: {
        olympiadEnergy: newEnergy,
        olympiadEnergyLastRegen: energyResult.lastRegen,
      },
    });

    // Calculate rewards if won
    let rewards: OlympiadBattleResult['rewards'] = null;

    if (won) {
      const rewardConfig = olympiad.rewards as {
        cash_min: number;
        cash_max: number;
        xp_min: number;
        xp_max: number;
        item_chance: number;
      };

      const cashReward =
        Math.floor(
          Math.random() * (rewardConfig.cash_max - rewardConfig.cash_min + 1),
        ) + rewardConfig.cash_min;

      const xpReward =
        Math.floor(
          Math.random() * (rewardConfig.xp_max - rewardConfig.xp_min + 1),
        ) + rewardConfig.xp_min;

      rewards = {
        cash: cashReward,
        xp: xpReward,
      };

      // Check for item drop
      if (Math.random() < rewardConfig.item_chance) {
        const droppedItem = await this.getRandomItem(olympiad.difficulty);
        if (droppedItem) {
          rewards.itemDrop = {
            itemId: droppedItem.id,
            itemName: droppedItem.name,
            rarity: droppedItem.rarity,
          };

          // Add item to inventory
          await this.prisma.characterInventory.upsert({
            where: {
              characterId_itemId: {
                characterId: character.id,
                itemId: droppedItem.id,
              },
            },
            create: {
              characterId: character.id,
              itemId: droppedItem.id,
              quantity: 1,
            },
            update: {
              quantity: { increment: 1 },
            },
          });
        }
      }

      // Apply rewards
      await this.prisma.character.update({
        where: { id: character.id },
        data: {
          cash: { increment: cashReward },
          totalXp: { increment: xpReward },
        },
      });
    }

    return {
      won,
      playerScore,
      npcScore,
      npcLevel,
      rewards,
      newOlympiadEnergy: newEnergy,
    };
  }

// ============ WEEKLY OLYMPIAD METHODS ============

  async getActiveWeeklyEvent(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const now = new Date();

    // Get current or next event
    const event = await this.prisma.olympiadWeeklyEvent.findFirst({
      where: {
        OR: [
          // Active event
          { startsAt: { lte: now }, endsAt: { gt: now } },
          // Upcoming event (within next 7 days)
          { startsAt: { gt: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } },
          // Recently ended (for claiming rewards)
          { endsAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), lt: now } },
        ],
      },
      include: {
        subject: true,
        participants: {
          where: { characterId: character.id },
          take: 1,
        },
      },
      orderBy: { startsAt: 'desc' },
    });

    if (!event) {
      return { event: null };
    }

    const participation = event.participants[0] || null;
    const totalParticipants = await this.prisma.olympiadWeeklyParticipant.count({
      where: { eventId: event.id },
    });

    return {
      event: {
        id: event.id,
        subject: event.subject ? { id: event.subject.id, name: event.subject.name } : null,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        rewardsByPercentile: event.rewardsByPercentile,
        status: this.getEventStatus(event.startsAt, event.endsAt),
        totalParticipants,
      },
      participation: participation
        ? {
            score: participation.score,
            rank: participation.rank,
            rewardsClaimed: participation.rewardsClaimed,
          }
        : null,
    };
  }

  private getEventStatus(startsAt: Date, endsAt: Date): 'upcoming' | 'active' | 'ended' {
    const now = new Date();
    if (now < startsAt) return 'upcoming';
    if (now >= startsAt && now < endsAt) return 'active';
    return 'ended';
  }

  async joinWeeklyEvent(userId: string, eventId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        subjects: true,
        equipment: { include: { item: true } },
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const event = await this.prisma.olympiadWeeklyEvent.findUnique({
      where: { id: eventId },
      include: { subject: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const now = new Date();
    if (now < event.startsAt) {
      throw new BadRequestException('Event has not started yet');
    }
    if (now >= event.endsAt) {
      throw new BadRequestException('Event has ended');
    }

    // Check if already joined
    const existing = await this.prisma.olympiadWeeklyParticipant.findUnique({
      where: {
        eventId_characterId: {
          eventId,
          characterId: character.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Already joined this event');
    }

    // Calculate score
    const score = this.calculateWeeklyScore(character, event.subjectId);

    const participation = await this.prisma.olympiadWeeklyParticipant.create({
      data: {
        eventId,
        characterId: character.id,
        score,
      },
    });

    return {
      score: participation.score,
      message: 'Successfully joined the weekly olympiad!',
    };
  }

  private calculateWeeklyScore(
    character: {
      level: number;
      subjects: { subjectId: string; level: number }[];
      equipment: { item: { stats: any } }[];
    },
    eventSubjectId: string | null,
  ): number {
    // Calculate average subject level
    let avgSubjectLevel = 1;
    if (eventSubjectId) {
      // Use specific subject level
      const subjectData = character.subjects.find(s => s.subjectId === eventSubjectId);
      avgSubjectLevel = subjectData?.level || 1;
    } else {
      // Average of all subjects
      avgSubjectLevel =
        character.subjects.reduce((sum, s) => sum + s.level, 0) / Math.max(character.subjects.length, 1);
    }

    // Calculate equipment bonus
    let equipmentBonus = 0;
    for (const eq of character.equipment) {
      const stats = eq.item.stats as Record<string, number>;
      equipmentBonus += stats.xp_bonus || 0;
      equipmentBonus += stats.grade_bonus || 0;
    }

    // Score formula:
    // avgSubjectLevel * 100 + characterLevel * 5 + equipmentBonus * 10 + random(0, 50)
    const randomVariance = Math.floor(Math.random() * 51);
    const score =
      Math.floor(avgSubjectLevel * 100) +
      character.level * 5 +
      equipmentBonus * 10 +
      randomVariance;

    return score;
  }

  async getWeeklyLeaderboard(eventId: string, limit: number = 50, offset: number = 0) {
    const event = await this.prisma.olympiadWeeklyEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const participants = await this.prisma.olympiadWeeklyParticipant.findMany({
      where: { eventId },
      include: {
        character: {
          include: { user: { select: { username: true } } },
        },
      },
      orderBy: { score: 'desc' },
      skip: offset,
      take: limit,
    });

    const total = await this.prisma.olympiadWeeklyParticipant.count({
      where: { eventId },
    });

    return {
      leaderboard: participants.map((p, index) => ({
        rank: p.rank || offset + index + 1,
        username: p.character.user.username,
        score: p.score,
        characterLevel: p.character.level,
      })),
      total,
      hasMore: offset + participants.length < total,
    };
  }

  async getMyWeeklyRank(userId: string, eventId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const participation = await this.prisma.olympiadWeeklyParticipant.findUnique({
      where: {
        eventId_characterId: {
          eventId,
          characterId: character.id,
        },
      },
    });

    if (!participation) {
      return { joined: false };
    }

    const total = await this.prisma.olympiadWeeklyParticipant.count({
      where: { eventId },
    });

    // Calculate current rank if not finalized
    let rank = participation.rank;
    if (!rank) {
      const betterScores = await this.prisma.olympiadWeeklyParticipant.count({
        where: {
          eventId,
          score: { gt: participation.score },
        },
      });
      rank = betterScores + 1;
    }

    const percentile = total > 0 ? ((total - rank) / total) * 100 : 0;

    return {
      joined: true,
      score: participation.score,
      rank,
      total,
      percentile: Math.round(percentile * 10) / 10,
      rewardsClaimed: participation.rewardsClaimed,
    };
  }

  async claimWeeklyRewards(userId: string, eventId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const event = await this.prisma.olympiadWeeklyEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (new Date() < event.endsAt) {
      throw new BadRequestException('Event has not ended yet');
    }

    const participation = await this.prisma.olympiadWeeklyParticipant.findUnique({
      where: {
        eventId_characterId: {
          eventId,
          characterId: character.id,
        },
      },
    });

    if (!participation) {
      throw new BadRequestException('You did not participate in this event');
    }

    if (participation.rewardsClaimed) {
      throw new BadRequestException('Rewards already claimed');
    }

    // Calculate rank if not set
    let rank = participation.rank;
    if (!rank) {
      const betterScores = await this.prisma.olympiadWeeklyParticipant.count({
        where: {
          eventId,
          score: { gt: participation.score },
        },
      });
      rank = betterScores + 1;
    }

    const total = await this.prisma.olympiadWeeklyParticipant.count({
      where: { eventId },
    });

    const percentile = total > 0 ? ((total - rank) / total) * 100 : 0;

    // Determine reward tier
    const rewards = event.rewardsByPercentile as {
      top10: { cash: number; xp: number };
      top25: { cash: number; xp: number };
      top50: { cash: number; xp: number };
      participation: { cash: number; xp: number };
    };

    let tier: string;
    let reward: { cash: number; xp: number };

    if (percentile >= 90) {
      tier = 'top10';
      reward = rewards.top10;
    } else if (percentile >= 75) {
      tier = 'top25';
      reward = rewards.top25;
    } else if (percentile >= 50) {
      tier = 'top50';
      reward = rewards.top50;
    } else {
      tier = 'participation';
      reward = rewards.participation;
    }

    // Apply rewards
    await this.prisma.$transaction([
      this.prisma.character.update({
        where: { id: character.id },
        data: {
          cash: { increment: reward.cash },
          totalXp: { increment: reward.xp },
        },
      }),
      this.prisma.olympiadWeeklyParticipant.update({
        where: { id: participation.id },
        data: { rewardsClaimed: true, rank },
      }),
    ]);

    return {
      tier,
      rank,
      percentile: Math.round(percentile * 10) / 10,
      rewards: reward,
    };
  }

  private async getRandomItem(difficulty: OlympiadDifficulty) {
    // Higher difficulty = better item rarity chances
    const rarityWeights: Record<OlympiadDifficulty, Record<string, number>> = {
      school: { common: 70, uncommon: 25, rare: 5, epic: 0, legendary: 0 },
      district: { common: 50, uncommon: 35, rare: 12, epic: 3, legendary: 0 },
      city: { common: 30, uncommon: 40, rare: 20, epic: 8, legendary: 2 },
      national: { common: 15, uncommon: 30, rare: 30, epic: 18, legendary: 7 },
    };

    const weights = rarityWeights[difficulty];
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    let selectedRarity = 'common';
    for (const [rarity, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        selectedRarity = rarity;
        break;
      }
    }

    // Get random item of selected rarity
    const items = await this.prisma.item.findMany({
      where: { rarity: selectedRarity as any },
    });

    if (items.length === 0) return null;

    return items[Math.floor(Math.random() * items.length)];
  }
}
