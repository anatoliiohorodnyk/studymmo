import { Controller, Get, Post, Param } from '@nestjs/common';
import { QuestsService } from './quests.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('quests')
export class QuestsController {
  constructor(private questsService: QuestsService) {}

  @Get()
  async getAvailableQuests(@CurrentUser() user: JwtPayload) {
    return this.questsService.getAvailableQuests(user.sub as string);
  }

  @Post(':questId/start')
  async startQuest(
    @CurrentUser() user: JwtPayload,
    @Param('questId') questId: string,
  ) {
    return this.questsService.startQuest(user.sub as string, questId);
  }
}
