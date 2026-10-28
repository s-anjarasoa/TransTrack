import { IsIn, IsOptional, Matches } from 'class-validator';

export class SimulatePaymentDto {
  // ✅ Traduction en français
  @IsIn(['SUCCES', 'ECHEC', 'ANNULATION'])
  outcome!: 'SUCCES' | 'ECHEC' | 'ANNULATION';

  @IsOptional()
  @IsIn(['MVOLA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'CARD'])
  method?: 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | 'CARD';

  @IsOptional()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Numéro de téléphone invalide' })
  phone?: string;
}