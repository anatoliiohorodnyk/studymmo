import { Controller, Post } from '@nestjs/common';
import { StudyService } from './study.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('study')
export class StudyController {
  constructor(private studyService: StudyService) {}

  @Post()
  async study(@CurrentUser() user: JwtPayload) {
    return this.studyService.study(user.sub as string);
  }
}
