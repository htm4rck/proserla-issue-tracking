import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from '../controller/reports.controller';
import { AreaEntity } from '../entity/area.entity';
import { InspectionResponseEntity } from '../entity/inspection-response.entity';
import { InspectionEntity } from '../entity/inspection.entity';
import { ReportsService } from '../service/reports.service';
import { InspectionConsolidatedReportService } from '../service/inspection-consolidated-report.service';

@Module({
  imports: [TypeOrmModule.forFeature([InspectionEntity, InspectionResponseEntity, AreaEntity])],
  controllers: [ReportsController],
  providers: [ReportsService, InspectionConsolidatedReportService],
})
export class ReportsModule {}
