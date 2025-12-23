import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GAME_CONFIG } from '../../config/game.config';

// Global debug state
let debugCooldownDisabled = false;

@Injectable()
export class DebugService {
  constructor(private prisma: PrismaService) {}

  getDebugConfig() {
    return {
      cooldownDisabled: debugCooldownDisabled,
    };
  }

  toggleCooldown() {
    debugCooldownDisabled = !debugCooldownDisabled;
    return {
      cooldownDisabled: debugCooldownDisabled,
    };
  }

  // Export for use in study service
  static isCooldownDisabled(): boolean {
    return debugCooldownDisabled;
  }

  async renewAllEnergy(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
    });

    if (!character) {
      throw new BadRequestException('Character not found');
    }

    await this.prisma.character.update({
      where: { id: character.id },
      data: {
        questEnergy: character.questEnergyMax,
        questEnergyLastRegen: new Date(),
        olympiadEnergy: character.olympiadEnergyMax,
        olympiadEnergyLastRegen: new Date(),
      },
    });

    return {
      questEnergy: character.questEnergyMax,
      olympiadEnergy: character.olympiadEnergyMax,
    };
  }

  async grantGrade(userId: string, subjectId: string, score?: number) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        currentClass: true,
      },
    });

    if (!character) {
      throw new BadRequestException('Character not found');
    }

    if (!character.currentClass) {
      throw new BadRequestException('No current class');
    }

    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      throw new BadRequestException('Subject not found');
    }

    const gradeScore = score ?? Math.floor(Math.random() * 30) + 70; // Default 70-100

    const grade = await this.prisma.characterGrade.create({
      data: {
        characterId: character.id,
        classId: character.currentClass.id,
        subjectId: subject.id,
        score: gradeScore,
      },
    });

    return {
      gradeId: grade.id,
      subjectName: subject.name,
      score: gradeScore,
    };
  }

  async getAllSubjects() {
    return this.prisma.subject.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async resetAccount(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: { city: { include: { locations: { orderBy: { orderIndex: 'asc' } } } } },
    });

    if (!character) {
      throw new BadRequestException('Character not found');
    }

    // Get first location and first class
    const firstLocation = character.city.locations[0];
    const firstClass = await this.prisma.class.findFirst({
      where: { locationId: firstLocation.id },
      orderBy: { gradeNumber: 'asc' },
    });

    // Delete all character progress
    await this.prisma.$transaction([
      // Delete grades
      this.prisma.characterGrade.deleteMany({
        where: { characterId: character.id },
      }),
      // Delete location progress
      this.prisma.characterLocationProgress.deleteMany({
        where: { characterId: character.id },
      }),
      // Delete inventory
      this.prisma.characterInventory.deleteMany({
        where: { characterId: character.id },
      }),
      // Delete equipment
      this.prisma.characterEquipment.deleteMany({
        where: { characterId: character.id },
      }),
      // Delete materials
      this.prisma.characterMaterial.deleteMany({
        where: { characterId: character.id },
      }),
      // Delete quest cooldowns
      this.prisma.characterQuestCooldown.deleteMany({
        where: { characterId: character.id },
      }),
      // Reset subject levels
      this.prisma.characterSubject.updateMany({
        where: { characterId: character.id },
        data: { level: 1, currentXp: 0 },
      }),
      // Reset character stats
      this.prisma.character.update({
        where: { id: character.id },
        data: {
          level: 1,
          totalXp: 0,
          cash: 0,
          questEnergy: 100,
          questEnergyMax: 100,
          questEnergyLastRegen: new Date(),
          olympiadEnergy: 50,
          olympiadEnergyMax: 50,
          olympiadEnergyLastRegen: new Date(),
          currentLocationId: firstLocation.id,
          currentClassId: firstClass?.id || null,
          totalStudyClicks: 0,
          studyClicksInCurrentClass: 0,
        },
      }),
    ]);

    return { success: true, message: 'Account reset to Prep School' };
  }
}
