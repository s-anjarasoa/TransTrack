import { IsInt, IsOptional, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { BilletCategorie } from '../../../entities/billet.entity';

export class CreateBilletDto {
  @Type(() => Number)
  @IsInt()
  reservationId!: number;

  @IsOptional()
  @IsString()
  numeroPlace?: string;

  @IsOptional()
  @IsEnum(BilletCategorie)
  categorie?: BilletCategorie;

  @IsOptional()
  @IsString()
  passagerNom?: string;

  @IsOptional()
  @IsString()
  passagerCIN?: string;

  @IsOptional()
  @IsString()
  passagerTelephone?: string;
}