import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VoyageStatut } from '../../../entities/voyage.entity';

export class ChangeVoyageStatusDto {
  @IsEnum(VoyageStatut)
  statut!: VoyageStatut;

  @IsOptional()
  @IsString()
  motifAnnulation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  retardMinutes?: number;
}