import { PartialType } from '@nestjs/mapped-types';
import { CreateBagageDto } from './create-bagage.dto';

export class UpdateBagageDto extends PartialType(CreateBagageDto) {}