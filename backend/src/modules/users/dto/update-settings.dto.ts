import { IsEnum, IsOptional } from 'class-validator';
import { GradeDisplaySystem } from '@prisma/client';

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(GradeDisplaySystem)
  gradeDisplaySystem?: GradeDisplaySystem;
}
