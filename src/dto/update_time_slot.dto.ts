import { IsOptional, IsString, IsBoolean, Matches } from 'class-validator';

export class UpdateTimeSlotDto {
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'slot_time must be in HH:MM format (e.g., 09:00)',
  })
  slot_time?: string;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @IsOptional()
  @IsString()
  session?: 'morning' | 'evening' | 'afternoon';
}
