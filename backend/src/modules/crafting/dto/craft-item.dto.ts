import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CraftItemDto {
  @IsString()
  recipeId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;
}
