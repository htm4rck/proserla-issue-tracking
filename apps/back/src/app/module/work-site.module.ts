import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkSiteController } from '../controller/work-site.controller';
import { WorkSiteEntity } from '../entity/work-site.entity';
import { WorkSiteService } from '../service/work-site.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkSiteEntity])],
  controllers: [WorkSiteController],
  providers: [WorkSiteService],
  exports: [WorkSiteService],
})
export class WorkSiteModule {}
