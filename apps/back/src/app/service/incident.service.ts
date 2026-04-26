import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { IncidentResponseEntity } from '../entity/incident-response.entity';
import { IncidentEntity } from '../entity/incident.entity';
import {
  CreateIncidentRequest,
  SearchIncidentsRequest,
  UpdateIncidentRequest,
} from '../mapper/incident.mapper';

function cleanFilter(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  return trimmed && lower !== 'undefined' && lower !== 'null' ? trimmed : undefined;
}

function toSnapshot(entity: IncidentEntity): Record<string, unknown> {
  return {
    incidentCode: entity.incidentCode,
    reportedBy: entity.reportedBy,
    reportYear: entity.reportYear,
    reportMonth: entity.reportMonth,
    reportDay: entity.reportDay,
    reportTime: entity.reportTime,
    site: entity.site,
    reportedPerson: entity.reportedPerson,
    reportedPersonAge: entity.reportedPersonAge,
    employerType: entity.employerType,
    areaCode: entity.areaCode,
    leaderCode: entity.leaderCode,
    assignedTo: entity.assignedTo,
    location: entity.location,
    workArea: entity.workArea,
    incidentType: entity.incidentType,
    riskLevel: entity.riskLevel,
    description: entity.description,
    comment: entity.comment,
    reportSource: entity.reportSource,
    correctiveMeasures: entity.correctiveMeasures,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

@Injectable()
export class IncidentService {
  constructor(
    @InjectRepository(IncidentEntity)
    private readonly incidentRepository: Repository<IncidentEntity>,
    @InjectRepository(IncidentResponseEntity)
    private readonly responseRepository: Repository<IncidentResponseEntity>,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(payload: CreateIncidentRequest, changedBy?: string): Promise<IncidentEntity> {
    const { evidence, ...incidentFields } = payload;
    const now = new Date();
    const saved = await this.incidentRepository.manager.transaction(async (manager) => {
      const incident = manager.create(IncidentEntity, {
        reportYear: now.getFullYear(),
        reportDay: now.getDate(),
        ...incidentFields,
        reportMonth: incidentFields.reportMonth?.trim().toUpperCase() || this.monthName(now),
      } as Partial<IncidentEntity>);
      const s = await manager.save(incident);

      if (evidence?.length) {
        for (const row of evidence) {
          await manager.save(
            IncidentResponseEntity,
            manager.create(IncidentResponseEntity, {
              incidentCode: s.incidentCode,
              status: s.status,
              imageType: row.imageType,
              url: row.url,
              storagePath: row.storagePath,
              uploadedBy: row.uploadedBy,
              comment: row.comment,
              uploadOk: row.uploadOk ?? true,
              uploadError: row.uploadError,
            }),
          );
        }
      }
      return s;
    });

    await this.auditLog.log({
      entityType: 'incident',
      entityId: saved.incidentCode,
      action: 'create',
      changedBy,
      currentSnapshot: toSnapshot(saved),
    });

    return saved;
  }

  async findAll(query: SearchIncidentsRequest): Promise<IncidentEntity[]> {
    const qb = this.incidentRepository.createQueryBuilder('incident');
    this.applyFilters(qb, query);
    return qb.orderBy('incident.createdAt', 'DESC').getMany();
  }

  async findPaged(query: SearchIncidentsRequest): Promise<{
    items: IncidentEntity[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }> {
    const qb = this.incidentRepository.createQueryBuilder('incident');
    this.applyFilters(qb, query);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [items, total] = await qb
      .orderBy('incident.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async findByIncidentCode(incidentCode: string): Promise<IncidentEntity | null> {
    return this.incidentRepository.findOne({ where: { incidentCode } });
  }

  async update(incidentCode: string, dto: UpdateIncidentRequest, changedBy?: string): Promise<IncidentEntity> {
    const saved = await this.incidentRepository.manager.transaction(async (manager) => {
      const incident = await manager.findOne(IncidentEntity, { where: { incidentCode } });
      if (!incident) throw new NotFoundException('Incidencia no encontrada');

      const previousSnapshot = toSnapshot(incident);
      const { evidence, ...scalarUpdates } = dto;

      const assignable = [
        'reportedBy', 'reportYear', 'reportMonth', 'reportDay', 'reportTime',
        'site', 'reportedPerson', 'reportedPersonAge', 'employerType',
        'areaCode', 'leaderCode', 'assignedTo', 'location', 'workArea',
        'incidentType', 'riskLevel', 'description', 'comment', 'reportSource',
        'correctiveMeasures', 'status',
      ] as const;

      for (const key of assignable) {
        const v = scalarUpdates[key];
        if (v !== undefined) {
          Object.assign(incident, {
            [key]: key === 'reportMonth' && typeof v === 'string' ? v.trim().toUpperCase() : v,
          });
        }
      }

      const nextStatus = dto.status ?? incident.status;
      if (nextStatus === 'closed') {
        const newClosureEvidence = (evidence ?? []).some(
          (e) => e.imageType === 'closure' && e.url.trim().length > 0,
        );
        const existingClosureCount = await manager.count(IncidentResponseEntity, {
          where: { incidentCode, imageType: 'closure' },
        });
        if (!newClosureEvidence && existingClosureCount <= 0) {
          throw new BadRequestException('Para cerrar una incidencia debes adjuntar evidencia de cierre');
        }
      }

      if (evidence?.length) {
        for (const row of evidence) {
          await manager.save(
            IncidentResponseEntity,
            manager.create(IncidentResponseEntity, {
              incidentCode,
              status: nextStatus,
              imageType: row.imageType,
              url: row.url,
              storagePath: row.storagePath,
              uploadedBy: row.uploadedBy,
              comment: row.comment,
              uploadOk: row.uploadOk ?? true,
              uploadError: row.uploadError,
            }),
          );
        }
      }

      const result = await manager.save(IncidentEntity, incident);
      return { result, previousSnapshot };
    });

    await this.auditLog.log({
      entityType: 'incident',
      entityId: incidentCode,
      action: 'update',
      changedBy,
      previousSnapshot: saved.previousSnapshot,
      currentSnapshot: toSnapshot(saved.result),
    });

    return saved.result;
  }

  async remove(incidentCode: string, changedBy?: string): Promise<void> {
    const incident = await this.incidentRepository.findOne({ where: { incidentCode } });
    if (!incident) throw new NotFoundException('Incidencia no encontrada');

    const snapshot = toSnapshot(incident);
    const result = await this.incidentRepository.delete({ incidentCode });
    if (!result.affected) throw new NotFoundException('Incidencia no encontrada');

    await this.auditLog.log({
      entityType: 'incident',
      entityId: incidentCode,
      action: 'delete',
      changedBy,
      previousSnapshot: snapshot,
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private applyFilters(qb: ReturnType<Repository<IncidentEntity>['createQueryBuilder']>, query: SearchIncidentsRequest): void {
    const status = cleanFilter(query.status);
    const areaCode = cleanFilter(query.areaCode);
    const leaderCode = cleanFilter(query.leaderCode);
    const riskLevel = cleanFilter(query.riskLevel);
    const incidentType = cleanFilter(query.incidentType);
    const reportMonth = cleanFilter(query.reportMonth);

    if (status) qb.andWhere('incident.status = :status', { status });
    if (areaCode) qb.andWhere('incident.areaCode = :areaCode', { areaCode });
    if (leaderCode) qb.andWhere('incident.leaderCode = :leaderCode', { leaderCode });
    if (riskLevel) qb.andWhere('incident.riskLevel = :riskLevel', { riskLevel });
    if (incidentType) qb.andWhere('incident.incidentType = :incidentType', { incidentType });
    if (reportMonth) {
      const monthNumber = this.monthNumber(reportMonth);
      qb.andWhere(
        '(UPPER(incident.reportMonth) = :reportMonth OR (incident.reportMonth IS NULL AND EXTRACT(MONTH FROM incident.createdAt) = :monthNumber))',
        { reportMonth: reportMonth.toUpperCase(), monthNumber },
      );
    }
    if (query.reportYear) {
      qb.andWhere(
        '(incident.reportYear = :reportYear OR (incident.reportYear IS NULL AND EXTRACT(YEAR FROM incident.createdAt) = :reportYear))',
        { reportYear: query.reportYear },
      );
    }
  }

  private monthName(date: Date): string {
    return ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][date.getMonth()];
  }

  private monthNumber(raw: string): number {
    const month = raw.trim().toUpperCase();
    const names = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const index = names.indexOf(month);
    return index >= 0 ? index + 1 : Number(month) || 0;
  }
}
