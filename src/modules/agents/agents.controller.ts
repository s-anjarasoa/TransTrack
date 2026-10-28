import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { FilterAgentsDto } from './dto/filter-agent.dto';
import { ChangeAgentStatusDto } from './../status/dto/change-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  // ============================================================
  // CRÉATION PAR ADMIN
  // ============================================================
  @Post('admin-create')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  createByAdmin(@Body() dto: CreateAgentDto) {
    return this.agentsService.createByAdmin(dto);
  }

  // ============================================================
  // LECTURE
  // ============================================================
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  findAll(@Query() filter: FilterAgentsDto, @Request() req) {
    return this.agentsService.findAll(filter, req.user);
  }

  // ⚠️ Doit rester AVANT ':id' sinon "me" serait interprété comme un id
  @Get('me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('AGENT')
  getMyProfile(@Request() req) {
    return this.agentsService.findByUserId(req.user.id);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.agentsService.findOneFor(id, req.user);
  }

  // ============================================================
  // CRÉATION D'UN AGENT PAR UN DIRECTEUR / GÉRANT
  // ============================================================
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('AGENT') // ou les rôles autorisés (ex: Directeur/Gérant)
  createTeamAgent(@Body() dto: CreateAgentDto, @Request() req) {
    return this.agentsService.createTeamAgent(dto, req.user);
  }

  // ============================================================
  // MISE À JOUR
  // ============================================================
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAgentDto,
    @Request() req,
  ) {
    return this.agentsService.update(id, dto, req.user);
  }

  // Le Directeur/Gérant passe l'agent à PRE_VALIDE → envoi du code par e-mail
  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'AGENT')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeAgentStatusDto,
    @Request() req,
  ) {
    return this.agentsService.changeStatus(id, dto, req.user);
  }

  // ============================================================
  // SUPPRESSION
  // ============================================================
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.agentsService.remove(id);
  }
}