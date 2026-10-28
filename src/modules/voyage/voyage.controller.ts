import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VoyageService } from './voyage.service';
import { CreateVoyageDto } from './dto/create-voyages.dto';
import { UpdateVoyageDto } from './dto/update-voyages.dto';
import { FilterVoyageDto } from './dto/filter-voyages.dto';
import { ChangeVoyageStatusDto } from './dto/change-voyage-status.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('voyages')
export class VoyageController {
  constructor(private readonly voyageService: VoyageService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('AGENT')
  create(@Body() dto: CreateVoyageDto, @Request() req) {
    return this.voyageService.create(dto, req.user);
  }

  // Public : recherche d'itinéraire par un client (module 4.4 du cahier des charges)
  @Public()
  @Get('search')
  search(@Query() filter: FilterVoyageDto) {
    return this.voyageService.findAll(filter, { id: 0, role: 'PUBLIC' });
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  findAll(@Query() filter: FilterVoyageDto, @Request() req) {
    return this.voyageService.findAll(filter, req.user);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.voyageService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  update(@Param('id') id: string, @Body() dto: UpdateVoyageDto, @Request() req) {
    return this.voyageService.update(+id, dto, req.user);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeVoyageStatusDto, @Request() req) {
    return this.voyageService.changeStatus(+id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  remove(@Param('id') id: string, @Request() req) {
    return this.voyageService.remove(+id, req.user);
  }
}