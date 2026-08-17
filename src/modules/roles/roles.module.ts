import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { Role } from '../../entities/role.entity';
import { User } from '../../entities/user.entity'; //  Ajouter l'import de User

@Module({
  imports: [TypeOrmModule.forFeature([Role, User])], //  Ajouter User dans forFeature
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
