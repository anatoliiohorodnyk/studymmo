import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GAME_CONFIG } from '../../config/game.config';
import {
  randomInt,
  calculateXpToNextLevel,
  calculateSubjectXpToNextLevel,
  generateGrade,
} from '../../common/utils/formulas';
import { CharactersService } from '../characters/characters.service';
import { ItemsService } from '../items/items.service';
import { InventoryService } from '../inventory/inventory.service';
import { DebugService } from '../debug/debug.service';
import { StudyResultDto, SubjectXpGain, GradeResult } from './dto/study-result.dto';
import { GradeDisplaySystem } from '@prisma/client';

@Injectable()
export class StudyService {
  private cooldowns: Map<string, number> = new Map();

  constructor(
    private prisma: PrismaService,
    private charactersService: CharactersService,
    private itemsService: ItemsService,
    private inventoryService: InventoryService,
  ) {}

  async study(userId: string): Promise<StudyResultDto> {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        user: true,
        subjects: {
          include: { subject: true },
        },
        currentClass: true,
        currentLocation: true,
      },
    });

    if (!character) {
      throw new BadRequestException('Character not found');
    }

    // Check cooldown (skip if debug mode)
    const now = Date.now();
    const lastClick = this.cooldowns.get(character.id) || 0;
    if (!DebugService.isCooldownDisabled() && now - lastClick < GAME_CONFIG.STUDY_COOLDOWN_MS) {
      throw new BadRequestException('Study is on cooldown');
    }
    this.cooldowns.set(character.id, now);

    // Get equipment bonuses
    const bonuses = await this.charactersService.getEquipmentBonuses(character.id);

    // Calculate XP gains
    const totalSubjectXp = randomInt(
      GAME_CONFIG.STUDY_SUBJECT_XP_MIN,
      GAME_CONFIG.STUDY_SUBJECT_XP_MAX,
    );
    const subjectsAffected = randomInt(
      GAME_CONFIG.STUDY_SUBJECTS_AFFECTED_MIN,
      GAME_CONFIG.STUDY_SUBJECTS_AFFECTED_MAX,
    );
    const xpPerSubject = Math.floor(totalSubjectXp / subjectsAffected);

    // Select random subjects (filtered by class's or location's allowed subjects)
    let availableSubjects = [...character.subjects];

    // Class-level restrictions have priority, then location-level
    const classAllowedSubjects = character.currentClass?.allowedSubjects as string[] | undefined;
    const locationAllowedSubjects = character.currentLocation.allowedSubjects as string[];

    const allowedSubjects = (classAllowedSubjects && classAllowedSubjects.length > 0)
      ? classAllowedSubjects
      : locationAllowedSubjects;

    if (allowedSubjects && allowedSubjects.length > 0) {
      availableSubjects = availableSubjects.filter(cs =>
        allowedSubjects.includes(cs.subjectId)
      );
    }

    const shuffledSubjects = availableSubjects.sort(() => Math.random() - 0.5);
    const selectedSubjects = shuffledSubjects.slice(0, Math.min(subjectsAffected, shuffledSubjects.length));

    const subjectXpGains: SubjectXpGain[] = [];
    const subjectUpdates: Promise<any>[] = [];

    for (const cs of selectedSubjects) {
      const xpWithBonus = Math.floor(xpPerSubject * (1 + bonuses.xpBonus / 100));
      let newXp = cs.currentXp + xpWithBonus;
      let newLevel = cs.level;
      let leveledUp = false;

      let xpToNext = calculateSubjectXpToNextLevel(newLevel);
      while (newXp >= xpToNext) {
        newXp -= xpToNext;
        newLevel++;
        leveledUp = true;
        xpToNext = calculateSubjectXpToNextLevel(newLevel);
      }

      subjectXpGains.push({
        subjectId: cs.subject.id,
        subjectName: cs.subject.name,
        xpGained: xpWithBonus,
        newXp,
        newLevel,
        leveledUp,
      });

      subjectUpdates.push(
        this.prisma.characterSubject.update({
          where: { id: cs.id },
          data: { currentXp: newXp, level: newLevel },
        }),
      );
    }

    // Character XP
    const characterXpGained = randomInt(
      GAME_CONFIG.STUDY_CHARACTER_XP_MIN,
      GAME_CONFIG.STUDY_CHARACTER_XP_MAX,
    );
    let newCharacterXp = Number(character.totalXp) + characterXpGained;
    let newCharacterLevel = character.level;
    let characterLeveledUp = false;

    let xpToNextLevel = calculateXpToNextLevel(newCharacterLevel);
    while (newCharacterXp >= xpToNextLevel) {
      newCharacterXp -= xpToNextLevel;
      newCharacterLevel++;
      characterLeveledUp = true;
      xpToNextLevel = calculateXpToNextLevel(newCharacterLevel);
    }

    // Cash
    let cashGained = 0;
    if (Math.random() < GAME_CONFIG.STUDY_CASH_CHANCE) {
      cashGained = randomInt(GAME_CONFIG.STUDY_CASH_MIN, GAME_CONFIG.STUDY_CASH_MAX);
      cashGained = Math.floor(cashGained * (1 + bonuses.cashBonus / 100));
    }

    // Update study clicks
    const newStudyClicks = character.studyClicksInCurrentClass + 1;
    const newTotalClicks = Number(character.totalStudyClicks) + 1;

    // Check for grade generation
    let grade: GradeResult | null = null;
    if (
      character.currentClass &&
      newStudyClicks % GAME_CONFIG.STUDY_CLICKS_PER_GRADE === 0
    ) {
      // Pick a random subject for the grade (from allowed subjects only)
      const randomSubject =
        availableSubjects[Math.floor(Math.random() * availableSubjects.length)];
      const gradeScore = generateGrade(randomSubject.level, bonuses.gradeBonus);

      await this.prisma.characterGrade.create({
        data: {
          characterId: character.id,
          classId: character.currentClass.id,
          subjectId: randomSubject.subject.id,
          score: gradeScore,
        },
      });

      grade = {
        subjectId: randomSubject.subject.id,
        subjectName: randomSubject.subject.name,
        score: gradeScore,
        displayGrade: this.formatGrade(gradeScore, character.user.gradeDisplaySystem),
      };

      // Grant 1.5x bonus XP to the subject that received the grade
      const gradeSubjectIndex = subjectXpGains.findIndex(
        (s) => s.subjectId === randomSubject.subject.id,
      );

      // Calculate bonus XP (50% of base XP per subject)
      const bonusXp = Math.floor(xpPerSubject * 0.5 * (1 + bonuses.xpBonus / 100));

      if (gradeSubjectIndex >= 0) {
        // Subject was already selected - add bonus to existing gain
        const existing = subjectXpGains[gradeSubjectIndex];
        let newXp = existing.newXp + bonusXp;
        let newLevel = existing.newLevel;
        let leveledUp = existing.leveledUp;

        let xpToNext = calculateSubjectXpToNextLevel(newLevel);
        while (newXp >= xpToNext) {
          newXp -= xpToNext;
          newLevel++;
          leveledUp = true;
          xpToNext = calculateSubjectXpToNextLevel(newLevel);
        }

        subjectXpGains[gradeSubjectIndex] = {
          ...existing,
          xpGained: existing.xpGained + bonusXp,
          newXp,
          newLevel,
          leveledUp,
        };

        // Update the subject in DB
        subjectUpdates.push(
          this.prisma.characterSubject.update({
            where: { id: randomSubject.id },
            data: { currentXp: newXp, level: newLevel },
          }),
        );
      } else {
        // Subject wasn't selected - add it with bonus XP only
        let newXp = randomSubject.currentXp + bonusXp;
        let newLevel = randomSubject.level;
        let leveledUp = false;

        let xpToNext = calculateSubjectXpToNextLevel(newLevel);
        while (newXp >= xpToNext) {
          newXp -= xpToNext;
          newLevel++;
          leveledUp = true;
          xpToNext = calculateSubjectXpToNextLevel(newLevel);
        }

        subjectXpGains.push({
          subjectId: randomSubject.subject.id,
          subjectName: randomSubject.subject.name,
          xpGained: bonusXp,
          newXp,
          newLevel,
          leveledUp,
        });

        subjectUpdates.push(
          this.prisma.characterSubject.update({
            where: { id: randomSubject.id },
            data: { currentXp: newXp, level: newLevel },
          }),
        );
      }
    }

    // Material drop
    let materialDrop: { materialId: string; materialName: string } | null = null;
    if (Math.random() < GAME_CONFIG.STUDY_MATERIAL_DROP_CHANCE) {
      const materials = await this.prisma.material.findMany();
      if (materials.length > 0) {
        const material = materials[Math.floor(Math.random() * materials.length)];
        await this.prisma.characterMaterial.upsert({
          where: {
            characterId_materialId: {
              characterId: character.id,
              materialId: material.id,
            },
          },
          create: {
            characterId: character.id,
            materialId: material.id,
            quantity: 1,
          },
          update: {
            quantity: { increment: 1 },
          },
        });
        materialDrop = {
          materialId: material.id,
          materialName: material.name,
        };
      }
    }

    // Item drop
    let itemDrop: { itemId: string; itemName: string; rarity: string } | null = null;
    if (Math.random() < GAME_CONFIG.STUDY_ITEM_DROP_CHANCE) {
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

    // Execute all updates
    await Promise.all([
      ...subjectUpdates,
      this.prisma.character.update({
        where: { id: character.id },
        data: {
          totalXp: BigInt(newCharacterXp),
          level: newCharacterLevel,
          cash: { increment: cashGained },
          totalStudyClicks: BigInt(newTotalClicks),
          studyClicksInCurrentClass: newStudyClicks,
        },
      }),
    ]);

    return {
      characterXpGained,
      newCharacterXp: newCharacterXp.toString(),
      newCharacterLevel,
      characterLeveledUp,
      subjectXpGains,
      cashGained,
      newCash: (Number(character.cash) + cashGained).toString(),
      grade,
      materialDrop,
      itemDrop,
      studyClicksInCurrentClass: newStudyClicks,
      clicksUntilNextGrade:
        GAME_CONFIG.STUDY_CLICKS_PER_GRADE -
        (newStudyClicks % GAME_CONFIG.STUDY_CLICKS_PER_GRADE),
      cooldownUntil: now + GAME_CONFIG.STUDY_COOLDOWN_MS,
    };
  }

  private formatGrade(score: number, system: GradeDisplaySystem): string {
    if (system === 'five_point') {
      if (score >= 90) return '5';
      if (score >= 75) return '4';
      if (score >= 60) return '3';
      if (score >= 40) return '2';
      return '1';
    }

    if (system === 'twelve_point') {
      if (score >= 97) return '12';
      if (score >= 93) return '11';
      if (score >= 90) return '10';
      if (score >= 85) return '9';
      if (score >= 80) return '8';
      if (score >= 75) return '7';
      if (score >= 68) return '6';
      if (score >= 60) return '5';
      if (score >= 52) return '4';
      if (score >= 44) return '3';
      if (score >= 36) return '2';
      return '1';
    }

    // Default: letter
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }
}
