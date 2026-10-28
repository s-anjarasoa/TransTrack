import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TarifsService } from './tarifs.service';
import { CreateTarifDto } from './dto/create-tarifs.dto';
import { UpdateTarifDto } from './dto/update-tarifs.dto';
import { FilterTarifDto } from './dto/filter-tarifs.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('tarifs')
export class TarifsController {
  constructor(private readonly tarifsService: TarifsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT') 
  create(@Body() dto: CreateTarifDto, @Request() req) {
    return this.tarifsService.create(dto, req.user);
  }

  // Public : un client doit pouvoir consulter les tarifs avant de réserver (module 4.4)
  @Public()
  @Get('by-route/:routeId')
  findByRoute(@Param('routeId') routeId: string) {
    return this.tarifsService.findAll({ routeId: +routeId, isActif: true, limit: 20 }, { id: 0, role: 'PUBLIC' });
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  findAll(@Query() filter: FilterTarifDto, @Request() req) {
    return this.tarifsService.findAll(filter, req.user);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  findOne(@Param('id') id: string) {
    return this.tarifsService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  update(@Param('id') id: string, @Body() dto: UpdateTarifDto, @Request() req) {
    return this.tarifsService.update(+id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  remove(@Param('id') id: string, @Request() req) {
    return this.tarifsService.remove(+id, req.user);
  }
}