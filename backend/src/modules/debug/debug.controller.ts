import { Controller, Post, Body, Get } from '@nestjs/common';
import { DebugService } from './debug.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('debug')
export class DebugController {
  constructor(private debugService: DebugService) {}

  @Get('config')
  getDebugConfig() {
    return this.debugService.getDebugConfig();
  }

  @Post('toggle-cooldown')
  async toggleCooldown() {
    return this.debugService.toggleCooldown();
  }

  @Post('renew-energy')
  async renewEnergy(@CurrentUser() user: JwtPayload) {
    return this.debugService.renewAllEnergy(user.sub as string);
  }

  @Post('grant-grade')
  async grantGrade(
    @CurrentUser() user: JwtPayload,
    @Body() body: { subjectId: string; score?: number },
  ) {
    return this.debugService.grantGrade(user.sub as string, body.subjectId, body.score);
  }

  @Get('subjects')
  async getSubjects() {
    return this.debugService.getAllSubjects();
  }

  @Post('reset-account')
  async resetAccount(@CurrentUser() user: JwtPayload) {
    return this.debugService.resetAccount(user.sub as string);
  }
}
