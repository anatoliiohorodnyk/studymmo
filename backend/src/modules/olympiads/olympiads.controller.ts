import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { OlympiadsService } from './olympiads.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('olympiads')
export class OlympiadsController {
  constructor(private olympiadsService: OlympiadsService) {}

  // ============ DAILY PVE OLYMPIAD ENDPOINTS ============

  @Get()
  async getOlympiads(@CurrentUser() user: JwtPayload) {
    return this.olympiadsService.getOlympiads(user.sub as string);
  }

  @Post(':id/battle')
  async battle(
    @CurrentUser() user: JwtPayload,
    @Param('id') olympiadId: string,
  ) {
    return this.olympiadsService.battle(user.sub as string, olympiadId);
  }

  // ============ WEEKLY OLYMPIAD ENDPOINTS ============

  @Get('weekly')
  async getWeeklyOlympiad(@CurrentUser() user: JwtPayload) {
    return this.olympiadsService.getActiveWeeklyEvent(user.sub as string);
  }

  @Post('weekly/:id/join')
  async joinWeeklyOlympiad(
    @CurrentUser() user: JwtPayload,
    @Param('id') eventId: string,
  ) {
    return this.olympiadsService.joinWeeklyEvent(user.sub as string, eventId);
  }

  @Get('weekly/:id/leaderboard')
  async getWeeklyLeaderboard(
    @Param('id') eventId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.olympiadsService.getWeeklyLeaderboard(
      eventId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('weekly/:id/my-rank')
  async getMyWeeklyRank(
    @CurrentUser() user: JwtPayload,
    @Param('id') eventId: string,
  ) {
    return this.olympiadsService.getMyWeeklyRank(user.sub as string, eventId);
  }

  @Post('weekly/:id/claim')
  async claimWeeklyRewards(
    @CurrentUser() user: JwtPayload,
    @Param('id') eventId: string,
  ) {
    return this.olympiadsService.claimWeeklyRewards(user.sub as string, eventId);
  }
}
