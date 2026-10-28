import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateMoyenTransDto } from './create-moyen-trans.dto';

export class UpdateMoyenTransDto extends PartialType(CreateMoyenTransDto) {
  @IsOptional()
  @IsBoolean()
  isActif?: boolean;
}