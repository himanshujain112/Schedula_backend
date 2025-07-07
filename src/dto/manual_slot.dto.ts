import {
  IsDateString,
  IsNotEmpty,
  IsString,
  Matches,
  IsInt,
  Min,
} from 'class-validator';

export class CreateManualSlotDto {
  @IsDateString()
  date: string;

  @IsString()
  start_time: string;

  @IsString()
  end_time: string;

  @IsInt()
  @Min(1, { message: 'patients_per_slot must be at least 1' })
  patients_per_slot: number;

  @IsString()
  @IsNotEmpty()
  session: 'morning' | 'evening';
}
