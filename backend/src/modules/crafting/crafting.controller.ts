import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CraftingService } from './crafting.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CraftItemDto } from './dto/craft-item.dto';

@Controller('crafting')
@UseGuards(JwtAuthGuard)
export class CraftingController {
  constructor(private craftingService: CraftingService) {}

  @Get('recipes')
  async getRecipes(@CurrentUser() user: { sub: string }) {
    return this.craftingService.getRecipes(user.sub);
  }

  @Get('materials')
  async getMaterials(@CurrentUser() user: { sub: string }) {
    return this.craftingService.getMaterials(user.sub);
  }

  @Post('craft')
  async craft(
    @CurrentUser() user: { sub: string },
    @Body() dto: CraftItemDto,
  ) {
    return this.craftingService.craft(user.sub, dto.recipeId, dto.quantity);
  }
}
