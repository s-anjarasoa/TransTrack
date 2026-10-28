import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoyenTrans } from '../../entities/moyen-trans.entity';
import { Agent } from '../../entities/agent.entity';
import { MoyensTransService } from './moyens-trans.service';
import { MoyensTransController } from './moyens-trans.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MoyenTrans, Agent])],
  controllers: [MoyensTransController],
  providers: [MoyensTransService],
  exports: [MoyensTransService],
})
export class MoyensTransModule {}