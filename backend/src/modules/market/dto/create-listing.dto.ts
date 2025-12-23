import { IsString, IsInt, Min } from 'class-validator';

export class CreateListingDto {
  @IsString()
  inventoryItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  @Min(1)
  pricePerUnit: number;
}
