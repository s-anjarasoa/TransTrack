
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class UpdatePositionDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precision?: number;
}
