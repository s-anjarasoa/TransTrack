import { PartialType } from '@nestjs/mapped-types';
import { CreateSocieteDto } from './create-societe.dto';

export class UpdateSocieteDto extends PartialType(CreateSocieteDto) {}