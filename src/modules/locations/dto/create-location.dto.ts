import {
  IsString, IsNotEmpty, Length, IsOptional, IsEnum,
  IsNumber, Min, Max, IsBoolean, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocationType } from '../../../entities/location.entity';

export class CreateLocationDto {
  @IsString() @IsNotEmpty() @Length(2, 150)
  name!: string;

  @IsEnum(LocationType)
  type!: LocationType;

  @IsOptional() @IsString() @Length(0, 100)
  province?: string;

  @IsOptional() @IsString() @Length(0, 100)
  region?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90)
  latitude?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180)
  longitude?: number;

  @IsOptional() @IsString() @Length(0, 255)
  address?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  societeId?: number;
}