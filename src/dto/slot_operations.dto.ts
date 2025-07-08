import { IsDateString, IsString, IsArray, IsNumber } from 'class-validator';

export class CheckSlotConflictDto {
  @IsDateString()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;
}

export class BulkDeleteSlotsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  slotIds: number[];
}
