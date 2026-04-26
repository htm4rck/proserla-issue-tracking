import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderController } from '../controller/leader.controller';
import { LeaderEntity } from '../entity/leader.entity';
import { LeaderService } from '../service/leader.service';

@Module({
  imports: [TypeOrmModule.forFeature([LeaderEntity])],
  controllers: [LeaderController],
  providers: [LeaderService],
  exports: [LeaderService],
})
export class LeaderModule {}
