import { Controller, Get } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('characters')
export class CharactersController {
  constructor(private charactersService: CharactersService) {}

  @Get('me')
  async getMyCharacter(@CurrentUser() user: JwtPayload) {
    return this.charactersService.getCharacter(user.sub as string);
  }
}
