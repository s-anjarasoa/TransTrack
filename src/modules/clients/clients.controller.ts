import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { FilterClientsDto } from './dto/filter-client.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('clients')
@UseGuards(AuthGuard('jwt'))
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // Le client connecté complète SON PROPRE profil — userId vient du token, jamais du body
  @Post('me')
  create(@Body() dto: CreateClientDto, @Request() req) {
    return this.clientsService.create(dto, req.user.id);
  }

  @Get('me')
  getMyProfile(@Request() req) {
    return this.clientsService.findByUserId(req.user.id);
  }

  @Patch('me')
  updateMyProfile(@Body() dto: UpdateClientDto, @Request() req) {
    return this.clientsService.findByUserId(req.user.id).then((client) =>
      this.clientsService.update(client.id, dto),
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll(@Query() filter: FilterClientsDto) {
    return this.clientsService.findAll(filter);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(+id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(+id);
  }
}