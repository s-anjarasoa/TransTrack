import { IsOptional, IsString } from 'class-validator';

export class CancelReservationDto {
  @IsOptional()
  @IsString()
  motifAnnulation?: string;
}