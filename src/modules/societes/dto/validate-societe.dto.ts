import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SocieteStatut } from '../../../entities/societe.entity';

export class ValidateSocieteDto {
  @IsEnum(SocieteStatut)
  statut!: SocieteStatut; // VALIDEE ou REJETEE attendu ici

  @IsOptional()
  @IsString()
  reason?: string;
}