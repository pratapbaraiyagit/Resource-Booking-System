import { IsNotEmpty, IsUUID, IsString, IsDateString } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  resourceId: string;

  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;
}
