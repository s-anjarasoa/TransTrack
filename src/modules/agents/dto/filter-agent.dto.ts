// filter-agents.dto.ts
import { IsOptional, IsString, IsInt, Min,Max, IsEmail, IsPhoneNumber, IsDateString, IsEnum, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { AgentType } from '../../../entities/agent.entity';
import { AgentStatus } from '../../../entities/status.entity';

export class FilterAgentsDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  CIN?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @IsEnum(AgentType)
  type?: AgentType;

  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;  // Ajout du filtre par statut

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  societeId?: number;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderBy?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsString()
  orderField?: string = 'createdAt';

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