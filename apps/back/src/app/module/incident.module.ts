import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from './audit-log.module';
import { IncidentController } from '../controller/incident.controller';
import { IncidentResponseEntity } from '../entity/incident-response.entity';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentService } from '../service/incident.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([IncidentEntity, IncidentResponseEntity]),
    AuditLogModule,
  ],
  controllers: [IncidentController],
  providers: [IncidentService],
  exports: [IncidentService],
})
export class IncidentModule {}
