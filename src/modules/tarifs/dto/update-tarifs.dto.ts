import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateTarifDto } from './create-tarifs.dto';

export class UpdateTarifDto extends PartialType(
  OmitType(CreateTarifDto, ['routeId'] as const),
) {
  @IsOptional()
  @IsBoolean()
  isActif?: boolean;
}