import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from '../controller/reports.controller';
import { AreaEntity } from '../entity/area.entity';
import { InspectionResponseEntity } from '../entity/inspection-response.entity';
import { InspectionEntity } from '../entity/inspection.entity';
import { ReportsService } from '../service/reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([InspectionEntity, InspectionResponseEntity, AreaEntity])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
