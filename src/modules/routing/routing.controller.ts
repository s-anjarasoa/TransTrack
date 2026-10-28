import {
  Body, Controller, Get, Post, Query, UseGuards,
  BadRequestException, Req,
} from '@nestjs/common';
import { RoutingService } from './routing.service';
import { FindPathDto } from './dto/find-path.dto';
import { RoutingCriteria } from 'src/entities/routing.entity';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('routing')
@UseGuards(JwtAuthGuard, RolesGuard)  
export class RoutingController {
  constructor(private readonly routing: RoutingService) {}

  @Post('shortest-path')
  @Roles('CLIENT', 'AGENT', 'ADMIN')
  findPath(@Body() dto: FindPathDto, @Req() req: any) {
    return this.routing.findPath(dto, req.user);
  }

 @Get('shortest-path')
@Roles('CLIENT', 'AGENT', 'ADMIN')
findPathGet(
  @Query('startId') startId: string,
  @Query('endId') endId: string,
  @Query('criteria') criteria: RoutingCriteria = RoutingCriteria.DISTANCE,
  @Query('algorithm') algorithm: any = 'A_STAR',
  @Query('societeId') societeId?: string,   // ← ✅ ajouté
  @Req() req: any = null,
) {
  const s = parseInt(startId, 10);
  const e = parseInt(endId, 10);
  if (isNaN(s) || isNaN(e)) {
    throw new BadRequestException('startId et endId requis (entiers)');
  }
  return this.routing.findPath(
    {
      startId: s,
      endId: e,
      criteria,
      algorithm,
      societeId: societeId ? parseInt(societeId, 10) : undefined,
    } as FindPathDto,
    req.user,
  );
}
  // Ajouter cette méthode dans routing.controller.ts
@Get('preview')
@Roles('CLIENT', 'AGENT', 'ADMIN')
preview(
  @Query('startId') startId: string,
  @Query('endId') endId: string,
  @Query('societeId') societeId: string | undefined,
  @Req() req: any,
) {
  const s = parseInt(startId, 10);
  const e = parseInt(endId, 10);
  if (isNaN(s) || isNaN(e)) {
    throw new BadRequestException('startId et endId requis');
  }
  return this.routing.preview(
    s,
    e,
    req.user,
    societeId ? parseInt(societeId, 10) : undefined,
  );
}

  // ─── Benchmark (ADMIN seulement) ───
  @Get('compare')
  @Roles('ADMIN')
  compare(
    @Query('startId') startId: string,
    @Query('endId') endId: string,
    @Query('criteria') criteria: RoutingCriteria = RoutingCriteria.DISTANCE,
  ) {
    const s = parseInt(startId, 10);
    const e = parseInt(endId, 10);
    if (isNaN(s) || isNaN(e)) {
      throw new BadRequestException('startId et endId requis');
    }
    return this.routing.compare(s, e, criteria);
  }

  @Get('stats')
  @Roles('ADMIN')
  stats() {
    return this.routing.getStats();
  }
}