import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAppointmentStatusDto {
  @IsEnum(['completed', 'cancelled', 'no-show'])
  status: 'completed' | 'cancelled' | 'no-show';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class GetAppointmentsDto {
  @IsOptional()
  @IsEnum(['scheduled', 'completed', 'cancelled'])
  status?: 'scheduled' | 'completed' | 'cancelled';

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}
