import { IsOptional, IsString, IsInt, Min, IsEmail, IsPhoneNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterClientsDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  CIN?: number;

  @IsOptional()
  @IsString()
  passport?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

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