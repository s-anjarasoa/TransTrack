import { IsString, IsPhoneNumber, Length, IsNotEmpty } from 'class-validator';

export class CompleteClientProfileDto {
  @IsString()
  @IsPhoneNumber()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @Length(1, 255)
  @IsNotEmpty()
  address!: string;

  @IsString()
  @Length(8, 20)
  @IsNotEmpty()
  CIN!: string;

  @IsString()
  @Length(1, 20)
  @IsNotEmpty()
  passport!: string;
}