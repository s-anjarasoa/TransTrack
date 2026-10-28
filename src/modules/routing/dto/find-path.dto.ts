import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { RoutingAlgorithm, RoutingCriteria } from 'src/entities/routing.entity';

export class FindPathDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  startId!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  endId!: number;

  @IsEnum(RoutingCriteria)
  @IsOptional()
  criteria: RoutingCriteria = RoutingCriteria.DISTANCE;

  @IsEnum(RoutingAlgorithm)
  @IsOptional()
  algorithm: RoutingAlgorithm = RoutingAlgorithm.A_STAR;

  /** Réservé à l'ADMIN — restreindre à une société */
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  societeId?: number;
}