import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards, ParseIntPipe, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification';
import { UpdateNotificationDto } from './dto/update-notification';
import { FilterNotificationsDto } from './dto/filter-notification';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';


@Controller('notifications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post()
  @Roles('ADMIN')
  create(@Body(ValidationPipe) dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Post('bulk')
  @Roles('ADMIN')
  createBulk(@Body(ValidationPipe) dtos: CreateNotificationDto[]) {
    return this.notificationsService.createBulk(dtos);
  }

  @Get('me')
  findMyNotifications(
    @Query(ValidationPipe) filter: FilterNotificationsDto,
    @Request() req,
  ) {
    return this.notificationsService.findMyNotifications(
      req.user.id,
      filter,
    );
  }

  @Get('me/unread-count')
  async countUnread(@Request() req) {
    const count = await this.notificationsService.countUnread(req.user.id);
    return { count };
  }

  @Get()
  @Roles('ADMIN')
  findAll(
    @Query(ValidationPipe) filter: FilterNotificationsDto,
    @Request() req,
  ) {
    return this.notificationsService.findAll(filter, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Get('statistics')
  @Roles('ADMIN')
  getStatistics() {
    return this.notificationsService.getStatistics();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.notificationsService.findOne(id, { id: req.user.id, role: req.user.role });
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: UpdateNotificationDto,
  ) {
    return this.notificationsService.update(id, dto);
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('me/read-all')
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/archive')
  archiver(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.notificationsService.archiver(id, req.user.id);
  }

  @Patch(':id/unarchive')
  desarchiver(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.notificationsService.desarchiver(id, req.user.id);
  }


  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.notificationsService.remove(id, {
      id: req.user.id,
      role: req.user.role,
    });
  }
  
  @Delete('clean/old')
  @Roles('ADMIN')
  cleanOld(@Query('days') days?: number) {
    return this.notificationsService.cleanOldNotifications(
      days ? Number(days) : 30,
    );
  }
}