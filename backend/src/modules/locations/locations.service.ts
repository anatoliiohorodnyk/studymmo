import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GAME_CONFIG } from '../../config/game.config';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async getProgress(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        city: {
          include: {
            locations: {
              orderBy: { orderIndex: 'asc' },
              include: {
                classes: true,
              },
            },
          },
        },
        locationProgress: true,
        currentClass: true,
        grades: true,
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const progressMap = new Map(
      character.locationProgress.map((p) => [p.locationId, p]),
    );

    return character.city.locations.map((location) => {
      const progress = progressMap.get(location.id);
      const isUnlocked = this.checkLocationUnlock(location, progressMap);

      let currentClassInfo: {
        gradeNumber: number;
        gradesCollected: Record<string, number>;
        gradesRequired: number;
      } | null = null;
      if (character.currentClass && character.currentClass.locationId === location.id) {
        const gradesCollected: Record<string, number> = {};
        for (const grade of character.grades) {
          if (grade.classId === character.currentClass.id) {
            gradesCollected[grade.subjectId] = (gradesCollected[grade.subjectId] || 0) + 1;
          }
        }

        currentClassInfo = {
          gradeNumber: character.currentClass.gradeNumber,
          gradesCollected,
          gradesRequired: character.currentClass.requiredGradesPerSubject,
        };
      }

      return {
        locationId: location.id,
        locationName: location.name,
        locationType: location.type,
        completionPercent: progress ? Number(progress.completionPercent) : 0,
        isCompleted: progress?.isCompleted || false,
        isUnlocked,
        currentClass: currentClassInfo,
      };
    });
  }

  async completeClass(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        currentClass: {
          include: { location: true },
        },
        grades: true,
        subjects: true,
        currentLocation: {
          include: { classes: { orderBy: { gradeNumber: 'asc' } } },
        },
      },
    });

    if (!character || !character.currentClass) {
      throw new BadRequestException('No current class');
    }

    // Check if all grades are collected
    const subjects = await this.prisma.subject.findMany();
    const gradesForClass = character.grades.filter(
      (g) => g.classId === character.currentClass!.id,
    );

    const gradesBySubject = new Map<string, number>();
    for (const grade of gradesForClass) {
      gradesBySubject.set(
        grade.subjectId,
        (gradesBySubject.get(grade.subjectId) || 0) + 1,
      );
    }

    const requiredGrades = character.currentClass.requiredGradesPerSubject;
    for (const subject of subjects) {
      const count = gradesBySubject.get(subject.id) || 0;
      if (count < requiredGrades) {
        throw new BadRequestException(
          `Need ${requiredGrades - count} more grades in ${subject.name}`,
        );
      }
    }

    // Find next class
    const currentLocation = character.currentLocation;
    const currentClassIndex = currentLocation.classes.findIndex(
      (c) => c.id === character.currentClass!.id,
    );
    const nextClass = currentLocation.classes[currentClassIndex + 1];

    // Calculate new progress
    const completedClasses = currentClassIndex + 1;
    const totalClasses = currentLocation.classes.length;
    const newPercent = (completedClasses / totalClasses) * 100;

    await this.prisma.$transaction([
      // Update location progress
      this.prisma.characterLocationProgress.upsert({
        where: {
          characterId_locationId: {
            characterId: character.id,
            locationId: currentLocation.id,
          },
        },
        create: {
          characterId: character.id,
          locationId: currentLocation.id,
          completionPercent: newPercent,
          isCompleted: !nextClass,
        },
        update: {
          completionPercent: newPercent,
          isCompleted: !nextClass,
        },
      }),
      // Update character
      this.prisma.character.update({
        where: { id: character.id },
        data: {
          currentClassId: nextClass?.id || null,
          studyClicksInCurrentClass: 0,
        },
      }),
    ]);

    return {
      completedClass: character.currentClass.gradeNumber,
      locationProgress: newPercent,
      nextClass: nextClass
        ? { id: nextClass.id, gradeNumber: nextClass.gradeNumber }
        : null,
      locationCompleted: !nextClass,
    };
  }

  async advanceToNextLocation(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        currentLocation: {
          include: { classes: { orderBy: { gradeNumber: 'asc' } } },
        },
        subjects: true,
        grades: true,
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    // Find next location
    const nextLocation = await this.prisma.location.findFirst({
      where: {
        cityId: character.cityId,
        orderIndex: character.currentLocation.orderIndex + 1,
      },
      include: {
        classes: { orderBy: { gradeNumber: 'asc' } },
      },
    });

    if (!nextLocation) {
      throw new BadRequestException('No next location available');
    }

    // Check requirements
    if (!nextLocation.unlockRequirement) {
      throw new BadRequestException('Location has no unlock requirements');
    }

    const req = nextLocation.unlockRequirement as {
      previous_location_id?: string;
      previous_location_percent?: number;
      required_subject_levels?: { subject_id: string; min_level: number }[];
    };

    // Check location progress
    const currentLocationProgress = this.calculateLocationProgress(character);
    const requiredPercent = req.previous_location_percent || 100;

    if (currentLocationProgress < requiredPercent) {
      throw new BadRequestException(
        `Need ${requiredPercent}% progress in ${character.currentLocation.name} (current: ${currentLocationProgress}%)`,
      );
    }

    // Check subject levels
    if (req.required_subject_levels) {
      for (const slReq of req.required_subject_levels) {
        const charSubject = character.subjects.find(
          (cs) => cs.subjectId === slReq.subject_id,
        );
        const currentLevel = charSubject?.level || 1;
        if (currentLevel < slReq.min_level) {
          throw new BadRequestException(
            `Subject level requirement not met for ${slReq.subject_id}`,
          );
        }
      }
    }

    // Find first class in next location
    const firstClass = nextLocation.classes[0];

    // Update character
    await this.prisma.character.update({
      where: { id: character.id },
      data: {
        currentLocationId: nextLocation.id,
        currentClassId: firstClass?.id || null,
        studyClicksInCurrentClass: 0,
      },
    });

    return {
      previousLocation: character.currentLocation.name,
      newLocation: nextLocation.name,
      newClass: firstClass
        ? { id: firstClass.id, gradeNumber: firstClass.gradeNumber }
        : null,
    };
  }

  private calculateLocationProgress(character: any): number {
    const location = character.currentLocation;
    const classes = location.classes;

    if (!classes || classes.length === 0) {
      return 0;
    }

    const allowedSubjects = location.allowedSubjects as string[];
    const relevantSubjectIds =
      allowedSubjects && allowedSubjects.length > 0
        ? allowedSubjects
        : character.subjects.map((cs: any) => cs.subjectId);

    const numSubjects = relevantSubjectIds.length;
    let totalGradesNeeded = 0;
    let totalGradesCollected = 0;

    for (const cls of classes) {
      const gradesNeededForClass = cls.requiredGradesPerSubject * numSubjects;
      totalGradesNeeded += gradesNeededForClass;

      const gradesForClass = character.grades.filter(
        (g: any) =>
          g.classId === cls.id && relevantSubjectIds.includes(g.subjectId),
      );

      const gradesBySubject = new Map<string, number>();
      for (const grade of gradesForClass) {
        const current = gradesBySubject.get(grade.subjectId) || 0;
        gradesBySubject.set(
          grade.subjectId,
          Math.min(current + 1, cls.requiredGradesPerSubject),
        );
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

  private checkLocationUnlock(
    location: any,
    progressMap: Map<string, any>,
  ): boolean {
    if (!location.unlockRequirement) {
      return true;
    }

    const req = location.unlockRequirement as {
      previous_location_percent?: number;
      previous_location_id?: string;
    };

    if (req.previous_location_id && req.previous_location_percent) {
      const prevProgress = progressMap.get(req.previous_location_id);
      return (
        prevProgress &&
        Number(prevProgress.completionPercent) >= req.previous_location_percent
      );
    }

    return true;
  }

  // ============ SPECIALIZATION METHODS ============

  async calculateSchoolGradeAverage(characterId: string): Promise<number> {
    const schoolLocation = await this.prisma.location.findFirst({
      where: { type: 'school' },
      include: { classes: { select: { id: true } } },
    });

    if (!schoolLocation) return 0;

    const schoolClassIds = schoolLocation.classes.map((c) => c.id);

    const grades = await this.prisma.characterGrade.findMany({
      where: {
        characterId,
        classId: { in: schoolClassIds },
      },
    });

    if (grades.length === 0) return 0;

    const totalScore = grades.reduce((sum, g) => sum + g.score, 0);
    return Math.round(totalScore / grades.length);
  }

  async getSpecializations(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        subjects: true,
        currentLocation: true,
        currentSpecialization: true,
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    // Only show specializations when at College
    if (character.currentLocation.type !== 'college') {
      return {
        currentSpecialization: null,
        specializations: [],
        canSelect: false,
        reason: 'Must be at College to view specializations',
      };
    }

    // Get all College specializations
    const specializations = await this.prisma.specialization.findMany({
      where: { locationId: character.currentLocationId },
    });

    const gradeAverage = await this.calculateSchoolGradeAverage(character.id);
    const characterCash = Number(character.cash);

    const result = specializations.map((spec) => {
      const req = spec.requirements as {
        required_subject_levels: {
          subject_id: string;
          subject_name: string;
          min_level: number;
        }[];
        min_grade_average: number;
      };

      // Check subject levels
      const subjectRequirements = req.required_subject_levels.map((sl) => {
        const charSubject = character.subjects.find(
          (cs) => cs.subjectId === sl.subject_id,
        );
        const currentLevel = charSubject?.level || 1;
        return {
          subjectId: sl.subject_id,
          subjectName: sl.subject_name,
          requiredLevel: sl.min_level,
          currentLevel,
          met: currentLevel >= sl.min_level,
        };
      });

      const subjectsMet = subjectRequirements.every((s) => s.met);
      const gradeAverageMet = gradeAverage >= req.min_grade_average;
      const costMet = characterCash >= spec.unlockCost;
      const canUnlock = subjectsMet && gradeAverageMet && costMet;

      return {
        id: spec.id,
        name: spec.name,
        requirements: {
          subjects: subjectRequirements,
          minGradeAverage: req.min_grade_average,
          currentGradeAverage: gradeAverage,
          gradeAverageMet,
          unlockCost: spec.unlockCost,
          costMet,
        },
        canUnlock,
        isSelected: character.currentSpecializationId === spec.id,
      };
    });

    return {
      currentSpecialization: character.currentSpecialization
        ? {
            id: character.currentSpecialization.id,
            name: character.currentSpecialization.name,
          }
        : null,
      specializations: result,
      canSelect: !character.currentSpecializationId,
      gradeAverage,
      cash: characterCash,
    };
  }

  async selectSpecialization(userId: string, specializationId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        subjects: true,
        currentLocation: true,
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    // Validation: Must be at College
    if (character.currentLocation.type !== 'college') {
      throw new BadRequestException('Must be at College to select specialization');
    }

    // Validation: Can't already have a specialization
    if (character.currentSpecializationId) {
      throw new BadRequestException('Already have a specialization selected');
    }

    // Get the specialization
    const specialization = await this.prisma.specialization.findUnique({
      where: { id: specializationId },
    });

    if (!specialization || specialization.locationId !== character.currentLocationId) {
      throw new NotFoundException('Specialization not found');
    }

    // Validate requirements
    const req = specialization.requirements as {
      required_subject_levels: {
        subject_id: string;
        subject_name: string;
        min_level: number;
      }[];
      min_grade_average: number;
    };
    const gradeAverage = await this.calculateSchoolGradeAverage(character.id);
    const characterCash = Number(character.cash);

    // Check subject levels
    for (const sl of req.required_subject_levels) {
      const charSubject = character.subjects.find(
        (cs) => cs.subjectId === sl.subject_id,
      );
      const currentLevel = charSubject?.level || 1;
      if (currentLevel < sl.min_level) {
        throw new BadRequestException(
          `${sl.subject_name} level ${sl.min_level} required (current: ${currentLevel})`,
        );
      }
    }

    // Check grade average
    if (gradeAverage < req.min_grade_average) {
      throw new BadRequestException(
        `Grade average ${req.min_grade_average}% required (current: ${gradeAverage}%)`,
      );
    }

    // Check cash
    if (characterCash < specialization.unlockCost) {
      throw new BadRequestException(
        `$${specialization.unlockCost} required (current: $${characterCash})`,
      );
    }

    // All validations passed - deduct cost and assign specialization
    await this.prisma.character.update({
      where: { id: character.id },
      data: {
        currentSpecializationId: specializationId,
        cash: character.cash - BigInt(specialization.unlockCost),
      },
    });

    return {
      success: true,
      specialization: {
        id: specialization.id,
        name: specialization.name,
      },
      cashDeducted: specialization.unlockCost,
      newCash: (characterCash - specialization.unlockCost).toString(),
    };
  }
}
