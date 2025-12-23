import { Controller, Get } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('subjects')
export class SubjectsController {
  constructor(private subjectsService: SubjectsService) {}

  @Public()
  @Get()
  async findAll() {
    return this.subjectsService.findAll();
  }
}
