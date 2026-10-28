export class ChangeStatusDto {}
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AgentStatus } from '../../../entities/status.entity';

export class ChangeAgentStatusDto {
  @IsEnum(AgentStatus)
  status!: AgentStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}