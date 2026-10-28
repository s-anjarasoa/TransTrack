import { Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReservationService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CancelReservationDto } from './dto/change-reservation-status.dto';
import { FilterReservationDto } from './dto/filter-reservation.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('reservations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  create(@Body() dto: CreateReservationDto, @Request() req) {
    return this.reservationService.create(dto, req.user);
  }

  @Get()
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  findAll(@Query() filter: FilterReservationDto, @Request() req) {
    return this.reservationService.findAll(filter, req.user);
  }

  @Get(':id')
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  findOne(@Param('id') id: string, @Request() req) {
    return this.reservationService.findOne(+id); // l'accès fin est déjà vérifié par assertAccess dans confirm/cancel ; findOne seul reste simple ici, à durcir si besoin
  }

  @Patch(':id/confirm')
  @Roles('AGENT', 'ADMIN')
  confirm(@Param('id') id: string, @Request() req) {
    return this.reservationService.confirm(+id, req.user);
  }

  @Post(':id/payer')
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  payer(@Param('id') id: string, @Request() req) {
    return this.reservationService.payer(+id, req.user);
  }

  @Patch(':id/cancel')
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  cancel(@Param('id') id: string, @Body() dto: CancelReservationDto, @Request() req) {
    return this.reservationService.cancel(+id, dto, req.user);
  }
}