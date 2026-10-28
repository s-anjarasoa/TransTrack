import { IsOptional, IsEnum, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationStatut } from '../../../entities/reservation.entity';

export class FilterReservationDto {
  @IsOptional() 
  @IsEnum(ReservationStatut) 
  statut?: ReservationStatut;
  
  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) 
  voyageId?: number;
  
  @IsOptional() 
  @Type(() => Number) 
  @IsInt() @Min(1) 
  clientId?: number; // ignoré si l'appelant est un Client
  
  @IsOptional() 
  @IsDateString() 
  fromDate?: string;
  
  @IsOptional() 
  @IsDateString() 
  toDate?: string;

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