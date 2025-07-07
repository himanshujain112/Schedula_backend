import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class SetBookingWindowDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'booking_start_time must be in HH:MM format (e.g., 09:00)',
  })
  booking_start_time: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'booking_end_time must be in HH:MM format (e.g., 17:00)',
  })
  booking_end_time: string;
}
