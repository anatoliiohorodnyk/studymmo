import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

const WEEKLY_REWARDS = {
  top10: { cash: 5000, xp: 1000 },
  top25: { cash: 2500, xp: 500 },
  top50: { cash: 1000, xp: 250 },
  participation: { cash: 100, xp: 50 },
};

@Injectable()
export class OlympiadsScheduler {
  private readonly logger = new Logger(OlympiadsScheduler.name);

  constructor(private prisma: PrismaService) {}

  // Create weekly event every Sunday at 18:00 UTC
  @Cron('0 18 * * 0')
  async createWeeklyEvent() {
    this.logger.log('Creating weekly olympiad event...');

    // Get all subjects for rotation
    const subjects = await this.prisma.subject.findMany();
    if (subjects.length === 0) {
      this.logger.warn('No subjects found, skipping weekly event creation');
      return;
    }

    // Rotate subject based on week of year
    const weekNumber = this.getWeekNumber(new Date());
    const subjectIndex = weekNumber % subjects.length;
    const selectedSubject = subjects[subjectIndex];

    // Event runs for 1 hour
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000); // +1 hour

    const event = await this.prisma.olympiadWeeklyEvent.create({
      data: {
        subjectId: selectedSubject.id,
        startsAt,
        endsAt,
        rewardsByPercentile: WEEKLY_REWARDS,
      },
    });

    this.logger.log(
      `Created weekly olympiad: ${selectedSubject.name} (${event.id}), ends at ${endsAt.toISOString()}`,
    );
  }

  // Finalize event every Sunday at 19:00 UTC (1 hour after start)
  @Cron('0 19 * * 0')
  async finalizeWeeklyEvent() {
    this.logger.log('Finalizing weekly olympiad event...');

    // Find the event that just ended
    const now = new Date();
    const event = await this.prisma.olympiadWeeklyEvent.findFirst({
      where: {
        endsAt: { lte: now },
        participants: { some: { rank: null } }, // Has participants without ranks
      },
      orderBy: { endsAt: 'desc' },
    });

    if (!event) {
      this.logger.log('No event to finalize');
      return;
    }

    // Get all participants ordered by score
    const participants = await this.prisma.olympiadWeeklyParticipant.findMany({
      where: { eventId: event.id },
      orderBy: { score: 'desc' },
    });

    if (participants.length === 0) {
      this.logger.log('No participants in event');
      return;
    }

    // Assign ranks
    for (let i = 0; i < participants.length; i++) {
      await this.prisma.olympiadWeeklyParticipant.update({
        where: { id: participants[i].id },
        data: { rank: i + 1 },
      });
    }

    this.logger.log(`Finalized ${participants.length} participants in event ${event.id}`);
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // Helper method to manually create an event (for testing/debug)
  async createTestEvent(durationMinutes: number = 60) {
    const subjects = await this.prisma.subject.findMany();
    if (subjects.length === 0) {
      throw new Error('No subjects found');
    }

    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

    return this.prisma.olympiadWeeklyEvent.create({
      data: {
        subjectId: randomSubject.id,
        startsAt,
        endsAt,
        rewardsByPercentile: WEEKLY_REWARDS,
      },
      include: { subject: true },
    });
  }
}
