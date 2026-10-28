import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAgentDto } from './create-agent.dto';

export class UpdateAgentDto extends PartialType(
  OmitType(CreateAgentDto, ['password', 'societeId'] as const),
) {}