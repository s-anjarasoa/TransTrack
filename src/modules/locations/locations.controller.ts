import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { FilterLocationDto } from './dto/filter-location.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ══════════════════════════════════════════════════════════
  // ✅ ROUTES STATIQUES (AVANT :id — ordre CRITIQUE)
  // ══════════════════════════════════════════════════════════

  @Public()
  @Get()
  findAll(@Query() filter: FilterLocationDto) {
    return this.locationsService.findAll(filter);
  }

  @Public()
  @Get('provinces')
  getProvinces() {
    return this.locationsService.getProvinces();
  }

  // ✅✅✅ CETTE ROUTE MANQUE — À AJOUTER ✅✅✅
  @Public()
  @Get('search')
  search(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.locationsService.search(q, limit ? +limit : 10);
  }

  @Public()
  @Get('geocode')
  geocode(@Query('q') q: string) {
    return this.locationsService.geocode(q);
  }

  @Public()
  @Get('reverse')
  reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.locationsService.reverseGeocode(+lat, +lng);
  }

  @Public()
  @Get('province/:name')
  getProvinceInfo(@Param('name') name: string) {
    return this.locationsService.getProvinceInfo(name);
  }

  // ══════════════════════════════════════════════════════════
  // ⚠️ ROUTE DYNAMIQUE EN DERNIER
  // ══════════════════════════════════════════════════════════

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.locationsService.findOne(+id);
  }

  // ══════════════════════════════════════════════════════════
  // 🔒 ADMIN / AGENT
  // ══════════════════════════════════════════════════════════

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  create(@Body() dto: CreateLocationDto) {
    return this.locationsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locationsService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.locationsService.remove(+id);
  }
}