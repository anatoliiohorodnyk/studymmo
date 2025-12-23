import { Controller, Get, Post, Param } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('locations')
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Get('progress')
  async getProgress(@CurrentUser() user: JwtPayload) {
    return this.locationsService.getProgress(user.sub as string);
  }

  @Post('complete-class')
  async completeClass(@CurrentUser() user: JwtPayload) {
    return this.locationsService.completeClass(user.sub as string);
  }

  @Post('advance')
  async advanceToNextLocation(@CurrentUser() user: JwtPayload) {
    return this.locationsService.advanceToNextLocation(user.sub as string);
  }

  // ============ SPECIALIZATION ENDPOINTS ============

  @Get('specializations')
  async getSpecializations(@CurrentUser() user: JwtPayload) {
    return this.locationsService.getSpecializations(user.sub as string);
  }

  @Post('specializations/:id/select')
  async selectSpecialization(
    @CurrentUser() user: JwtPayload,
    @Param('id') specializationId: string,
  ) {
    return this.locationsService.selectSpecialization(
      user.sub as string,
      specializationId,
    );
  }
}
