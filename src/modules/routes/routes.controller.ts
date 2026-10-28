import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  Request, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-routes.dto';
import { UpdateRouteDto } from './dto/update-routes.dto';
import { FilterRouteDto } from './dto/filter-routes.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  create(@Body() dto: CreateRouteDto, @Request() req) {
    return this.routesService.create(dto, req.user);
  }

  @Public()
  @Get()
  findAllPublic(@Query() filter: FilterRouteDto) {
    return this.routesService.findAll(filter, { id: 0, role: 'PUBLIC' });
  }

  @Get('mine')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  findMine(@Query() filter: FilterRouteDto, @Request() req) {
    return this.routesService.findAll(filter, req.user);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  update(@Param('id') id: string, @Body() dto: UpdateRouteDto, @Request() req) {
    return this.routesService.update(+id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  remove(@Param('id') id: string, @Request() req) {
    return this.routesService.remove(+id, req.user);
  }
}