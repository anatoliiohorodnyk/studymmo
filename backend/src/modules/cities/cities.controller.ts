import { Controller, Get, Param } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('cities')
export class CitiesController {
  constructor(private citiesService: CitiesService) {}

  @Public()
  @Get()
  async findAll() {
    return this.citiesService.findAll();
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.citiesService.findOne(id);
  }
}
