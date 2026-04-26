import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from '../controller/reports.controller';
import { AreaEntity } from '../entity/area.entity';
import { IncidentResponseEntity } from '../entity/incident-response.entity';
import { IncidentEntity } from '../entity/incident.entity';
import { ReportsService } from '../service/reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([IncidentEntity, IncidentResponseEntity, AreaEntity])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
