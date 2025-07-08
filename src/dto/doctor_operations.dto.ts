import { IsDateString, IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export class CopyAvailabilityDto {
  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;
}

export class RescheduleAppointmentDto {
  @IsNumber()
  newSlotId: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class GetStatisticsDto {
  @IsOptional()
  @IsEnum(['week', 'month', 'year'])
  period?: 'week' | 'month' | 'year' = 'month';
}

export class GetRevenueDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CreateEmergencySlotDto {
  @IsDateString()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsString()
  reason: string;
}

export class GetUpcomingAppointmentsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  days?: number = 7;
}
