import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from './audit-log.module';
import { InspectionController } from '../controller/inspection.controller';
import { InspectionResponseEntity } from '../entity/inspection-response.entity';
import { InspectionSerialEntity } from '../entity/inspection-serial.entity';
import { InspectionEntity } from '../entity/inspection.entity';
import { AreaEntity } from '../entity/area.entity';
import { UserEntity } from '../entity/user.entity';
import { InspectionService } from '../service/inspection.service';
import { InspectionReportService } from '../service/inspection-report.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InspectionEntity,
      InspectionResponseEntity,
      InspectionSerialEntity,
      AreaEntity,
      UserEntity,
    ]),
    AuditLogModule,
  ],
  controllers: [InspectionController],
  providers: [InspectionService, InspectionReportService],
  exports: [InspectionService],
})
export class InspectionModule {}
