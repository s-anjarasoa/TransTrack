import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BagagesService } from './bagages.service';
import { CreateBagageDto } from './dto/create-bagage.dto';
import { UpdateBagageDto } from './dto/update-bagage.dto';
import { FilterBagagesDto } from './dto/filter-bagage.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('bagages')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BagagesController {
  constructor(private readonly bagagesService: BagagesService) {}

  @Post()
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  create(@Body() dto: CreateBagageDto, @Request() req) {
    return this.bagagesService.create(dto, req.user);
  }

  @Get()
  @Roles('AGENT', 'ADMIN')
  findAll(@Query() filter: FilterBagagesDto, @Request() req) {
    return this.bagagesService.findAll(filter, req.user);
  }

  @Get('reservation/:reservationId')
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  findByReservation(@Param('reservationId') id: string, @Request() req) {
    return this.bagagesService.findByReservation(+id, req.user);
  }

  @Patch(':id')
  @Roles('AGENT', 'ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateBagageDto, @Request() req) {
    return this.bagagesService.update(+id, dto, req.user);
  }

  @Delete(':id')
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  remove(@Param('id') id: string, @Request() req) {
    return this.bagagesService.remove(+id, req.user);
  }
}