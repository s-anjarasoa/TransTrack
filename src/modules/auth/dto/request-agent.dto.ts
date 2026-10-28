import {
  IsString,
  IsPhoneNumber,
  Length,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AgentType } from '../../../entities/agent.entity';

export class RequestAgentDto {
  @IsString()
  @IsPhoneNumber()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @Length(1, 255)
  @IsNotEmpty()
  address!: string;

  @IsString()
  @Length(8, 20)
  @IsNotEmpty()
  CIN!: string;

  @IsOptional()
  @IsEnum(AgentType)
  type?: AgentType;

  // ✅ La société choisie dans le dropdown
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  societeId!: number;
}