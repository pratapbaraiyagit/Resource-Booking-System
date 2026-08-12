import { IsNotEmpty, IsTimeZone, Matches } from 'class-validator';

export class GetAvailabilityDto {
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @IsNotEmpty()
  @IsTimeZone({ message: 'timezone must be a valid IANA timezone' })
  timezone: string;
}
