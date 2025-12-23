import { IsString, MinLength, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;
}
