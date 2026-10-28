import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscribeDto } from './dto/subscribe.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AbonnementsService } from './abonnements.service';

// ✅ On ajoute 'abonnements' pour correspondre à l'appel du frontend
@Controller(['subscriptions', 'abonnements'])
export class AbonnementsController {
  constructor(private readonly service: AbonnementsService) {}

  // ✅ NOUVELLE ROUTE : Liste des abonnements (pour le dashboard)
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  findAll(@Query() query: any, @Request() req) {
    return this.service.findAll(query, req.user);
  }

  // État de l'abonnement de ma société (ACTIF, EXPIRE_BIENTOT, EXPIRE, AUCUN)
  @Get('status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  status(@Request() req, @Query('societeId') societeId?: string) {
    const id = Number(societeId);
    return this.service.getStatus(
      req.user,
      societeId && Number.isInteger(id) ? id : undefined,
    );
  }

  @Get('plans')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  plans() {
    return this.service.getPlans();
  }

  // Crée l'abonnement (inactif) + le paiement, renvoie l'URL de paiement
  @Post('subscribe')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  subscribe(@Body() dto: SubscribeDto, @Request() req) {
    return this.service.subscribe(req.user, dto);
  }

  // Relance le paiement d'un abonnement créé mais non payé
  @Post(':id/pay')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  pay(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.payExisting(id, req.user);
  }
}