import { Controller, Get, Patch, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(user.sub as string);
  }

  @Patch('settings')
  async updateSettings(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(user.sub as string, dto);
  }
}
