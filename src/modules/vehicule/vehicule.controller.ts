import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VehiculeService } from './vehicule.service';
import { CreateVehiculeDto } from './dto/create-vehicule.dto';
import { UpdateVehiculeDto } from './dto/update-vehicule.dto';
import { FilterVehiculeDto } from './dto/filter-vehicule.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('vehicules')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'AGENT')
export class VehiculeController {
  constructor(private readonly vehiculeService: VehiculeService) {}

  @Post()
  create(@Body() dto: CreateVehiculeDto, @Request() req) {
    return this.vehiculeService.create(dto, req.user);
  }

  @Get()
  findAll(@Query() filter: FilterVehiculeDto, @Request() req) {
    return this.vehiculeService.findAll(filter, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiculeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVehiculeDto, @Request() req) {
    return this.vehiculeService.update(+id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.vehiculeService.remove(+id, req.user);
  }
}