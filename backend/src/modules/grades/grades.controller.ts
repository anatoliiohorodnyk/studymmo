import { Controller, Get, Query } from '@nestjs/common';
import { GradesService } from './grades.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('grades')
export class GradesController {
  constructor(private gradesService: GradesService) {}

  @Get()
  async getGrades(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
  ) {
    return this.gradesService.getGrades(user.sub as string, classId);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: JwtPayload) {
    return this.gradesService.getGradeStats(user.sub as string);
  }
}
