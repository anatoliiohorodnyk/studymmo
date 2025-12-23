import { Controller, Get, Post } from '@nestjs/common';
import { DailyRewardsService } from './daily-rewards.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('daily-rewards')
export class DailyRewardsController {
  constructor(private dailyRewardsService: DailyRewardsService) {}

  @Get()
  async getStatus(@CurrentUser() user: JwtPayload) {
    return this.dailyRewardsService.getStatus(user.sub as string);
  }

  @Post('claim')
  async claim(@CurrentUser() user: JwtPayload) {
    return this.dailyRewardsService.claim(user.sub as string);
  }
}
