import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlanningService, PlanningProposal } from './planning.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('planning')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Get('optimize')
  @Roles('ADMIN', 'AGENT')
  optimize(@Query('date') date: string, @Req() req: any) {
    // On suppose que req.user.societeId est disponible (via le token ou la base)
    // Si l'admin, il faut passer un societeId en query
    const societeId = req.user.societeId; 
    return this.planningService.optimize(societeId, date || new Date().toISOString());
  }

  @Post('apply')
  @Roles('ADMIN', 'AGENT')
  apply(@Body() proposals: PlanningProposal[]) {
    return this.planningService.apply(proposals);
  }
}