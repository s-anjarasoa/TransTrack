// create-status.dto.ts
import { IsEnum, IsOptional, IsString, IsDateString, IsNumber, IsObject, IsBoolean } from 'class-validator';
import { AgentStatus } from '../../../entities/status.entity';

export class CreateStatusDto {
  @IsEnum(AgentStatus)
  status!: AgentStatus;

  @IsNumber()
  agentId!: number;

  @IsOptional()
  @IsNumber()
  changedByUserId?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsDateString()
  suspendedUntil?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: {
    previousStatus?: AgentStatus;
    notes?: string;
    documentUrl?: string;
  };
}