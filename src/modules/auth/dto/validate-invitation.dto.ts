import { IsString, IsNotEmpty, Length } from 'class-validator';

export class ValidateInvitationDto {
  @IsString()
  @Length(6, 20)
  @IsNotEmpty()
  code!: string;
}