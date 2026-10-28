import { 
  IsInt, Min, IsOptional, IsEnum, IsString, IsArray, 
  IsObject, ValidateNested, IsNumber 
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationSource } from '../../../entities/reservation.entity';

// ✅ DTO pour les scores de l'IA
export class ProposalScoresDto {
  @IsNumber()
  distance!: number;

  @IsNumber()
  duration!: number;

  @IsNumber()
  price!: number;
}

// ✅ DTO pour une proposition
export class ProposalDto {
  @IsInt()
  voyageId!: number;

  @IsObject()
  @ValidateNested()
  @Type(() => ProposalScoresDto)
  scores!: ProposalScoresDto;
}

// ✅ DTO pour le contexte d'IA
export class RecommendationContextDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalDto)
  proposals!: ProposalDto[];

  @IsInt()
  @Min(0)
  chosenIndex!: number;
}

export class CreateReservationDto {
  @Type(() => Number)
  @IsInt()
  voyageId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  nombrePlaces!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clientId?: number;

  @IsOptional()
  @IsEnum(['CLASSE', 'ECONOMIE'])
  categorie?: 'CLASSE' | 'ECONOMIE';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sieges?: string[];

  @IsOptional()
  @IsEnum(ReservationSource)
  source?: ReservationSource;

  @IsOptional()
  @IsString()
  notes?: string;

  // ✅ NOUVEAU : Contexte de recommandation pour l'apprentissage de l'IA
  @IsOptional()
  @ValidateNested()
  @Type(() => RecommendationContextDto)
  recommendationContext?: RecommendationContextDto;
}