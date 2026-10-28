// filter-status.dto.ts
import { IsOptional, IsEnum, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { AgentStatus } from '../../../entities/status.entity';

export class FilterStatusDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  agentId?: number;

  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  changedByUserId?: number;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}