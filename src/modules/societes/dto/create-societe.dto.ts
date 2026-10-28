import { IsString, IsEmail, IsPhoneNumber, Length, Matches } from 'class-validator';

export class CreateSocieteDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @IsPhoneNumber()
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(1, 255)
  address!: string;

  @IsString()
  @Length(1, 20)
  @Matches(/^[0-9]+$/, { message: 'Le NIF doit contenir uniquement des chiffres' })
  nif!: string;

  @IsString()
  @Length(1, 20)
  numState!: string;

  // directeurId retiré : déduit de req.user côté service
  // isValide/statut retirés : jamais modifiable à la création
}