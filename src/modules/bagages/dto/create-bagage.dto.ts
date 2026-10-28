import { IsEnum, IsNumber, IsOptional, IsString, IsNotEmpty, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { BagageType } from '../../../entities/bagage.entity';

export class CreateBagageDto {
  @IsEnum(BagageType, { message: 'Type de bagage invalide' })
  @IsNotEmpty()
  type!: BagageType;

  @Type(() => Number)
  @IsNumber({}, { message: 'Le poids doit être un nombre' })
  @Min(0, { message: 'Le poids doit être positif' })
  @Max(100, { message: 'Le poids ne peut pas dépasser 100 kg' })
  @IsNotEmpty()
  poids!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
    
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  reservationId!: number;
}