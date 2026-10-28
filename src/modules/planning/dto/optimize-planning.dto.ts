import { IsOptional, IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class OptimizePlanningDto {
  @IsDateString()
  date!: string; // Format YYYY-MM-DD

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  societeId?: number;
}