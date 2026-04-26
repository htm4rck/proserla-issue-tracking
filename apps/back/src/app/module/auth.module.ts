import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from '../controller/auth.controller';
import { LeaderEntity } from '../entity/leader.entity';
import { UserEntity } from '../entity/user.entity';
import { AuthService } from '../service/auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, LeaderEntity])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
