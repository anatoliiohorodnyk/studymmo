import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GAME_CONFIG } from '../../config/game.config';
import {
  calculateXpToNextLevel,
  calculateSubjectXpToNextLevel,
  calculateEnergyRegen,
} from '../../common/utils/formulas';
import { CharacterResponseDto } from './dto/character-response.dto';

@Injectable()
export class CharactersService {
  constructor(private prisma: PrismaService) {}

  async getCharacter(userId: string): Promise<CharacterResponseDto> {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        user: {
          select: { username: true },
        },
        currentLocation: {
          include: {
            classes: { orderBy: { gradeNumber: 'asc' } },
          },
        },
        currentClass: true,
        currentSpecialization: true,
        subjects: {
          include: {
            subject: true,
          },
        },
        equipment: {
          include: {
            item: true,
          },
        },
        locationProgress: true,
        grades: true,
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    // Calculate energy regen
    const questEnergyResult = calculateEnergyRegen(
      character.questEnergyLastRegen,
      character.questEnergy,
      character.questEnergyMax,
      GAME_CONFIG.QUEST_ENERGY_REGEN_MINUTES,
    );

    const olympiadEnergyResult = calculateEnergyRegen(
      character.olympiadEnergyLastRegen,
      character.olympiadEnergy,
      character.olympiadEnergyMax,
      GAME_CONFIG.OLYMPIAD_ENERGY_REGEN_MINUTES,
    );

    // Update energy if changed
    if (
      questEnergyResult.energy !== character.questEnergy ||
      olympiadEnergyResult.energy !== character.olympiadEnergy
    ) {
      await this.prisma.character.update({
        where: { id: character.id },
        data: {
          questEnergy: questEnergyResult.energy,
          questEnergyLastRegen: questEnergyResult.lastRegen,
          olympiadEnergy: olympiadEnergyResult.energy,
          olympiadEnergyLastRegen: olympiadEnergyResult.lastRegen,
        },
      });
    }

    // Calculate dynamic location progress based on collected grades
    const currentLocationProgress = this.calculateLocationProgress(character);

    // Get next class info (within the same location)
    let nextClassInfo: {
      id: string;
      gradeNumber: number;
      requirements: {
        subjects: { subjectId: string; subjectName: string; gradesCollected: number; gradesRequired: number; met: boolean }[];
      };
      canAdvance: boolean;
    } | null = null;

    if (character.currentClass) {
      const currentClassIndex = character.currentLocation.classes.findIndex(
        (c: any) => c.id === character.currentClass!.id
      );
      const nextClass = character.currentLocation.classes[currentClassIndex + 1];

      if (nextClass) {
        // Calculate grades needed for current class before advancing
        // Class-level restrictions have priority, then location-level
        const classAllowedSubjects = character.currentClass!.allowedSubjects as string[] | undefined;
        const locationAllowedSubjects = character.currentLocation.allowedSubjects as string[];
        const relevantSubjectIds = (classAllowedSubjects && classAllowedSubjects.length > 0)
          ? classAllowedSubjects
          : (locationAllowedSubjects && locationAllowedSubjects.length > 0)
            ? locationAllowedSubjects
            : character.subjects.map((cs: any) => cs.subjectId);

        const subjectRequirements = relevantSubjectIds.map((subjectId: string) => {
          const subject = character.subjects.find((cs: any) => cs.subjectId === subjectId);
          const gradesForSubject = character.grades.filter(
            (g: any) => g.classId === character.currentClass!.id && g.subjectId === subjectId
          );
          const gradesCollected = gradesForSubject.length;
          const gradesRequired = character.currentClass!.requiredGradesPerSubject;

          return {
            subjectId,
            subjectName: subject?.subject?.name || 'Unknown',
            gradesCollected,
            gradesRequired,
            met: gradesCollected >= gradesRequired,
          };
        });

        const canAdvance = subjectRequirements.every((s: any) => s.met);

        nextClassInfo = {
          id: nextClass.id,
          gradeNumber: nextClass.gradeNumber,
          requirements: {
            subjects: subjectRequirements,
          },
          canAdvance,
        };
      }
    }

    // Get next location info
    const nextLocation = await this.prisma.location.findFirst({
      where: {
        cityId: character.cityId,
        orderIndex: character.currentLocation.orderIndex + 1,
      },
    });

    // Calculate next location requirements
    let nextLocationInfo: {
      id: string;
      name: string;
      requirements: {
        subjectLevels?: { subjectId: string; subjectName: string; minLevel: number; currentLevel: number; met: boolean; gradesCollected: number; gradesRequired: number }[];
        locationPercent?: { percent: number; current: number; met: boolean };
      };
      canUnlock: boolean;
    } | null = null;

    if (nextLocation && nextLocation.unlockRequirement) {
      const req = nextLocation.unlockRequirement as {
        previous_location_id?: string;
        previous_location_percent?: number;
        required_subject_levels?: { subject_id: string; subject_name: string; min_level: number }[];
      };

      // Calculate grades collected per subject in current class
      const gradesCollected: Record<string, { collected: number; required: number }> = {};
      const currentClass = character.currentClass;
      if (currentClass) {
        const classAllowedSubjects = currentClass.allowedSubjects as string[] | undefined;
        const locationAllowedSubjects = character.currentLocation.allowedSubjects as string[];
        const relevantSubjectIds = (classAllowedSubjects && classAllowedSubjects.length > 0)
          ? classAllowedSubjects
          : (locationAllowedSubjects && locationAllowedSubjects.length > 0)
            ? locationAllowedSubjects
            : character.subjects.map((cs: any) => cs.subjectId);

        for (const subjectId of relevantSubjectIds) {
          const gradesForSubject = character.grades.filter(
            (g: any) => g.classId === currentClass.id && g.subjectId === subjectId
          );
          gradesCollected[subjectId] = {
            collected: gradesForSubject.length,
            required: currentClass.requiredGradesPerSubject,
          };
        }
      }

      const subjectLevels = req.required_subject_levels?.map((sl) => {
        const charSubject = character.subjects.find((cs) => cs.subjectId === sl.subject_id);
        const currentLevel = charSubject?.level || 1;
        const gradeInfo = gradesCollected[sl.subject_id];
        return {
          subjectId: sl.subject_id,
          subjectName: sl.subject_name,
          minLevel: sl.min_level,
          currentLevel,
          met: currentLevel >= sl.min_level,
          gradesCollected: gradeInfo?.collected || 0,
          gradesRequired: gradeInfo?.required || 0,
        };
      });

      // Use dynamic progress calculation instead of stored progress
      const currentPercent = currentLocationProgress;
      const requiredPercent = req.previous_location_percent || 100;

      const locationPercentMet = currentPercent >= requiredPercent;
      const subjectsMet = subjectLevels?.every((sl) => sl.met) ?? true;

      nextLocationInfo = {
        id: nextLocation.id,
        name: nextLocation.name,
        requirements: {
          subjectLevels,
          locationPercent: req.previous_location_percent ? {
            percent: req.previous_location_percent,
            current: currentPercent,
            met: locationPercentMet,
          } : undefined,
        },
        canUnlock: locationPercentMet && subjectsMet,
      };
    }

    const equipmentSlots = ['pen', 'notebook', 'backpack', 'calculator', 'glasses'] as const;
    const equipmentMap = new Map(
      character.equipment.map((eq) => [eq.slot as string, eq]),
    );

    return {
      id: character.id,
      username: character.user.username,
      level: character.level,
      totalXp: character.totalXp.toString(),
      xpToNextLevel: calculateXpToNextLevel(character.level),
      cash: character.cash.toString(),
      questEnergy: questEnergyResult.energy,
      questEnergyMax: character.questEnergyMax,
      olympiadEnergy: olympiadEnergyResult.energy,
      olympiadEnergyMax: character.olympiadEnergyMax,
      currentLocation: {
        id: character.currentLocation.id,
        name: character.currentLocation.name,
        type: character.currentLocation.type,
      },
      currentClass: character.currentClass
        ? {
            id: character.currentClass.id,
            gradeNumber: character.currentClass.gradeNumber,
          }
        : null,
      totalStudyClicks: character.totalStudyClicks.toString(),
      studyClicksInCurrentClass: character.studyClicksInCurrentClass,
      subjects: character.subjects.map((cs) => ({
        id: cs.id,
        subjectId: cs.subject.id,
        subjectName: cs.subject.name,
        category: cs.subject.category,
        level: cs.level,
        currentXp: cs.currentXp,
        xpToNextLevel: calculateSubjectXpToNextLevel(cs.level),
      })),
      equipment: equipmentSlots.map((slot) => {
        const eq = equipmentMap.get(slot);
        return {
          slot,
          item: eq
            ? {
                id: eq.item.id,
                name: eq.item.name,
                rarity: eq.item.rarity,
                stats: eq.item.stats as Record<string, number>,
              }
            : null,
        };
      }),
      nextClass: nextClassInfo,
      nextLocation: nextLocationInfo,
      currentSpecialization: character.currentSpecialization
        ? {
            id: character.currentSpecialization.id,
            name: character.currentSpecialization.name,
          }
        : null,
      createdAt: character.createdAt,
    };
  }

  async getEquipmentBonuses(characterId: string): Promise<{
    xpBonus: number;
    cashBonus: number;
    gradeBonus: number;
  }> {
    const equipment = await this.prisma.characterEquipment.findMany({
      where: { characterId },
      include: { item: true },
    });

    let xpBonus = 0;
    let cashBonus = 0;
    let gradeBonus = 0;

    for (const eq of equipment) {
      const stats = eq.item.stats as Record<string, number>;
      xpBonus += stats.xp_bonus || 0;
      cashBonus += stats.cash_bonus || 0;
      gradeBonus += stats.grade_bonus || 0;
    }

    return { xpBonus, cashBonus, gradeBonus };
  }

  private calculateLocationProgress(character: any): number {
    const location = character.currentLocation;
    const classes = location.classes;

    if (!classes || classes.length === 0) {
      return 0;
    }

    const locationAllowedSubjects = location.allowedSubjects as string[];
    const allSubjectIds = character.subjects.map((cs: any) => cs.subjectId);

    // Calculate total grades needed for the entire location
    let totalGradesNeeded = 0;
    let totalGradesCollected = 0;

    for (const cls of classes) {
      // Class-level restrictions have priority, then location-level
      const classAllowedSubjects = cls.allowedSubjects as string[] | undefined;
      const relevantSubjectIds = (classAllowedSubjects && classAllowedSubjects.length > 0)
        ? classAllowedSubjects
        : (locationAllowedSubjects && locationAllowedSubjects.length > 0)
          ? locationAllowedSubjects
          : allSubjectIds;

      const numSubjects = relevantSubjectIds.length;
      const gradesNeededForClass = cls.requiredGradesPerSubject * numSubjects;
      totalGradesNeeded += gradesNeededForClass;

      // Count grades collected for this class (only from relevant subjects)
      const gradesForClass = character.grades.filter(
        (g: any) => g.classId === cls.id && relevantSubjectIds.includes(g.subjectId)
      );

      // Cap grades per subject at requiredGradesPerSubject
      const gradesBySubject = new Map<string, number>();
      for (const grade of gradesForClass) {
        const current = gradesBySubject.get(grade.subjectId) || 0;
        gradesBySubject.set(grade.subjectId, Math.min(current + 1, cls.requiredGradesPerSubject));
      }

      for (const count of gradesBySubject.values()) {
        totalGradesCollected += count;
      }
    }

    if (totalGradesNeeded === 0) {
      return 0;
    }

    const progress = (totalGradesCollected / totalGradesNeeded) * 100;
    return Math.min(100, Math.round(progress * 100) / 100);
  }
}
