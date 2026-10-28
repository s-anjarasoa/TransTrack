import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SocietesService } from './societes.service';
import { CreateSocieteDto } from './dto/create-societe.dto';
import { UpdateSocieteDto } from './dto/update-societe.dto';
import { FilterSocietesDto } from './dto/filter-societe.dto';
import { ValidateSocieteDto } from './dto/validate-societe.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from 'src/common/decorators/public.decorator';
import { AbonnementType } from 'src/entities/abonnement.entity';

@Controller('societes')
@UseGuards(AuthGuard('jwt'))
export class SocietesController {
  constructor(private readonly societesService: SocietesService) {}

  // ✅ Sociétés validées ET abonnées (abonnement payé, non expiré)
  @Public()
  @Get('public')
  findAllPublic(@Query(ValidationPipe) filter: FilterSocietesDto) {
    return this.societesService.findAllPublic(filter);
  }
  
  @Post()
  create(@Body() dto: CreateSocieteDto, @Request() req) {
    return this.societesService.create(dto, req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll(@Query() filter: FilterSocietesDto) {
    return this.societesService.findAll(filter);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'AGENT')
  findOne(@Param('id') id: string) {
    return this.societesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateSocieteDto) {
    return this.societesService.update(+id, dto);
  }

  @Patch(':id/validate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  validate(@Param('id') id: string, @Body() dto: ValidateSocieteDto, @Request() req) {
    return this.societesService.validate(+id, dto, req.user.id);
  }

  @Post(':id/regenerate-code')
  regenerateCode(@Param('id') id: string, @Request() req) {
    return this.societesService.regenerateInvitationCode(+id, req.user.id);
  }
   
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.societesService.remove(+id);
  }

 /* @Post(':id/payer-abonnement')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'AGENT') // Le Directeur a le rôle AGENT
  payerAbonnement(
    @Param('id') id: string, 
    @Request() req,
    @Body('type') type?: AbonnementType
  ) {
    return this.societesService.payerAbonnement(+id, req.user, type);
  }*/
}