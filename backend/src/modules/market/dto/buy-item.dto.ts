import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class BuyItemDto {
  @IsString()
  listingId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;
}
