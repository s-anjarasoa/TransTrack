import { IsOptional, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { ToBoolean } from 'src/common/decorators/to-boolean.decorator';
import { Type } from 'class-transformer';
import { MoyenTransType } from '../../../entities/moyen-trans.entity';

export class FilterMoyenTransDto {
  @IsOptional() 
  @IsEnum(MoyenTransType) 
  type?: MoyenTransType;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
   isActif?: boolean;

  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) societeId?: number; 

  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) page?: number = 1;

  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) limit?: number = 10;
}