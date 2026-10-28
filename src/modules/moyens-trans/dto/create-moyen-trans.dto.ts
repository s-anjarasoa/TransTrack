import { IsString, IsEnum, IsOptional, Length } from 'class-validator';
import { MoyenTransType } from '../../../entities/moyen-trans.entity';

export class CreateMoyenTransDto {
  @IsEnum(MoyenTransType)
  type!: MoyenTransType;

  @IsString()
  @Length(1, 100)
  nom!: string;

  @IsOptional()
  @IsString()
  description?: string;

}