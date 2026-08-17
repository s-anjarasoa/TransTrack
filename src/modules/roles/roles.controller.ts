import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus, UseGuards, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from '../../entities/role.entity';

@Controller('roles')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll(): Promise<Role[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Role> {
    const role = await this.rolesService.findOne(+id);
    if (!role) {
      throw new NotFoundException(`Rôle avec l'ID ${id} non trouvé`);
    }
    return role;
  }

  @Get('name/:name')
  async findByName(@Param('name') name: string): Promise<Role> {
    const role = await this.rolesService.findByName(name);
    if (!role) {
      throw new NotFoundException(`Rôle avec le nom ${name} non trouvé`);
    }
    return role;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return this.rolesService.create(createRoleDto.name, createRoleDto.description, createRoleDto.isDefault);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<Role> {
    return this.rolesService.update(+id, updateRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.rolesService.delete(+id);
  }

  @Get('stats/user-count')
  async getUserCount(): Promise<{ count: number }> {
    const count = await this.rolesService.getUserCount();
    return { count };
  }

  @Get('simulation/registration-order')
  async getRoleByRegistrationOrder(): Promise<{ role: Role; userCount: number; message: string }> {
    const userCount = await this.rolesService.getUserCount();
    const role = await this.rolesService.getRoleByRegistrationOrder();
    
    let message = '';
    if (userCount === 0) {
      message = 'Le prochain utilisateur sera ADMINISTRATEUR';
    } else if (userCount === 1) {
      message = 'Le prochain utilisateur sera AGENT';
    } else {
      message = `Le prochain utilisateur sera CLIENT (${userCount + 1}ème utilisateur)`;
    }
    
    return {
      role,
      userCount,
      message,
    };
  }
}

