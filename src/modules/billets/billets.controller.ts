import { Controller, Get, Post, Patch, Body, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BilletService } from './billets.service';
import { CreateBilletDto } from './dto/create-billet.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('billets')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BilletController {
  constructor(private readonly billetService: BilletService) {}

  @Post()
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  create(@Body() dto: CreateBilletDto, @Request() req) {
    return this.billetService.create(dto, req.user);
  }

  @Get('reservation/:reservationId')
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  findByReservation(@Param('reservationId') reservationId: string, @Request() req) {
    return this.billetService.findByReservation(+reservationId, req.user);
  }

  @Patch(':id/annuler')
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  annuler(@Param('id') id: string, @Request() req) {
    return this.billetService.annuler(+id, req.user);
  }

  @Patch(':id/valider')
  @Roles('AGENT', 'ADMIN')
  valider(@Param('id') id: string, @Request() req) {
    return this.billetService.valider(+id, req.user);
  }

  // ✅ Route pour le scan QR
  @Patch('scan/:qrCode')
  @Roles('AGENT', 'ADMIN')
  validerParQrCode(@Param('qrCode') qrCode: string, @Request() req) {
    return this.billetService.validerParQrCode(qrCode, req.user);
  }

  // ✅ Route pour l'envoi par email
  @Post(':id/envoyer-email')
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  envoyerParEmail(@Param('id') id: string) {
    return this.billetService.envoyerParEmail(+id);
  }
}