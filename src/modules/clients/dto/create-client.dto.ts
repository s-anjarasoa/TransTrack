import { IsString, IsPhoneNumber, Length, IsOptional, IsObject } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsPhoneNumber()
  phone!: string;

  @IsString()
  @Length(1, 255)
  address!: string;

  @IsString()
  @Length(8, 20)
  CIN!: string;

  @IsString()
  @Length(1, 20)
  passport!: string;

  @IsOptional()
  @IsObject()
  preferences?: any;
}