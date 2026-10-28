import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MoyensTransService } from './moyens-trans.service';
import { CreateMoyenTransDto } from './dto/create-moyen-trans.dto';
import { UpdateMoyenTransDto } from './dto/update-moyen-trans.dto';
import { FilterMoyenTransDto } from './dto/filter-moyens-trans.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('moyens-trans')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MoyensTransController {
  constructor(private readonly moyensTransService: MoyensTransService) {}

  @Post()
  @Roles('AGENT')
  create(@Body() dto: CreateMoyenTransDto, @Request() req) {
    return this.moyensTransService.create(dto, req.user);
  }

  @Get()
  @Roles('ADMIN', 'AGENT')
  findAll(@Query() filter: FilterMoyenTransDto, @Request() req) {
    return this.moyensTransService.findAll(filter, req.user);
  }

  @Get(':id')
  @Roles('ADMIN', 'AGENT', 'CLIENT')
  findOne(@Param('id') id: string) {
    return this.moyensTransService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'AGENT')
  update(@Param('id') id: string, @Body() dto: UpdateMoyenTransDto, @Request() req) {
    return this.moyensTransService.update(+id, dto, req.user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AGENT')
  remove(@Param('id') id: string, @Request() req) {
    return this.moyensTransService.remove(+id, req.user);
  }
}