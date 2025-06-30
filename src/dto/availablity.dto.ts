import { IsDateString, IsEnum, IsNotEmpty } from 'class-validator';

export class CreateAvailabilityDto {
  @IsDateString({}, { message: 'Date must be a valid ISO date (YYYY-MM-DD)' })
  date: string; // e.g. "2025-06-24"
  @IsNotEmpty()
  start_time: string; // e.g. "10:00"
  @IsNotEmpty()
  end_time: string; // e.g. "13:00"
  @IsEnum(['morning', 'evening'], {
    message: 'Session must be either "morning" or "evening"',
  })
  session: 'morning' | 'evening';
  @IsEnum(
    [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    {
      message: 'Weekday must be a valid day',
    },
  )
  weekday: string;
}
