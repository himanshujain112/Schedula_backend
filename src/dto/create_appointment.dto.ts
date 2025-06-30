import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsNotEmpty()
  doctor_id: number;
  @IsDateString({}, { message: 'Date must be a valid ISO date (YYYY-MM-DD)' })
  date: string; // ISO format e.g. 2025-06-25
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
  @IsEnum(['morning', 'evening'], {
    message: 'Session must be either "morning" or "evening"',
  })
  session: 'morning' | 'evening';
  @IsString()
  @IsNotEmpty({ message: 'Start time is required' })
  start_time: string;
  @IsOptional()
  @IsString()
  reason?: string;
  @IsOptional()
  @IsString()
  notes?: string;
}
