import { IsString, IsEmail, IsPhoneNumber, Length, MinLength, IsOptional, IsEnum, IsNotEmpty, ValidateIf } from 'class-validator';
import { AgentType } from '../../../entities/agent.entity';

export class RegisterAgentDto {
  @IsString() @IsNotEmpty()
  firstName!: string;

  @IsString() @IsNotEmpty()
  lastName!: string;

  @IsString() @IsPhoneNumber()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString() @MinLength(8)
  password!: string;

  @IsString() @Length(1, 255)
  address!: string;

  @IsString() @Length(8, 20)
  CIN!: string;

  @IsOptional()
  @IsEnum(AgentType)
  @ValidateIf((o) => o.type !== AgentType.DIRECTEUR, { message: 'Seul un Administrateur peut créer un DIRECTEUR' })
  type?: AgentType;

  // Détermine la société côté serveur — jamais de societeId en clair
  @IsString() @IsNotEmpty()
  invitationCode!: string;
}
