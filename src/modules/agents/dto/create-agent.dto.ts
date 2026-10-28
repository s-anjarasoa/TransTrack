import { IsString, IsEmail, IsPhoneNumber, Length, MinLength, IsNotEmpty, IsInt, Min, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { AgentType } from '../../../entities/agent.entity';

export class CreateAgentDto {
  @IsString() 
  @IsNotEmpty()
  firstName!: string;

  @IsString() 
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsPhoneNumber()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString() 
  @MinLength(8)
  password!: string;

  @IsString() @Length(1, 255)
  address!: string;

  @IsString() @Length(8, 20)
  CIN!: string;

  @IsEnum(AgentType)
  type!: AgentType;

  // Optionnel : absent uniquement lors du bootstrap d'un DIRECTEUR (pas encore de société)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  societeId?: number;
}