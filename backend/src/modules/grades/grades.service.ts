import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GradeDisplaySystem } from '@prisma/client';

@Injectable()
export class GradesService {
  constructor(private prisma: PrismaService) {}

  async getGrades(userId: string, classId?: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        user: true,
        grades: {
          where: classId ? { classId } : {},
          include: {
            subject: true,
            class: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    return character.grades.map((grade) => ({
      id: grade.id,
      subjectId: grade.subjectId,
      subjectName: grade.subject.name,
      classId: grade.classId,
      classNumber: grade.class.gradeNumber,
      score: grade.score,
      displayGrade: this.formatGrade(grade.score, character.user.gradeDisplaySystem),
      createdAt: grade.createdAt,
    }));
  }

  async getGradeStats(userId: string) {
    const character = await this.prisma.character.findUnique({
      where: { userId },
      include: {
        grades: {
          include: { subject: true },
        },
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    const statsBySubject: Record<
      string,
      { subject: string; count: number; total: number; average: number }
    > = {};

    for (const grade of character.grades) {
      if (!statsBySubject[grade.subjectId]) {
        statsBySubject[grade.subjectId] = {
          subject: grade.subject.name,
          count: 0,
          total: 0,
          average: 0,
        };
      }
      statsBySubject[grade.subjectId].count++;
      statsBySubject[grade.subjectId].total += grade.score;
    }

    for (const stats of Object.values(statsBySubject)) {
      stats.average = Math.round(stats.total / stats.count);
    }

    const totalGrades = character.grades.length;
    const totalScore = character.grades.reduce((sum, g) => sum + g.score, 0);
    const overallAverage = totalGrades > 0 ? Math.round(totalScore / totalGrades) : 0;

    return {
      overallAverage,
      totalGrades,
      bySubject: Object.values(statsBySubject),
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

    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }
}
