import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { InspectionResponseEntity } from '../entity/inspection-response.entity';
import { InspectionEntity } from '../entity/inspection.entity';
import { UserEntity } from '../entity/user.entity';
import {
  CreateInspectionRequest,
  SearchInspectionsRequest,
  UpdateInspectionRequest,
} from '../mapper/inspection.mapper';

function cleanFilter(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  return trimmed && lower !== 'undefined' && lower !== 'null' ? trimmed : undefined;
}

function toSnapshot(entity: InspectionEntity): Record<string, unknown> {
  return {
    inspectionCode: entity.inspectionCode,
    reportedBy: entity.reportedBy,
    reportedByUserId: entity.reportedByUserId,
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
    inspectionType: entity.inspectionType,
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
export class InspectionService {
  constructor(
    @InjectRepository(InspectionEntity)
    private readonly inspectionRepository: Repository<InspectionEntity>,
    @InjectRepository(InspectionResponseEntity)
    private readonly responseRepository: Repository<InspectionResponseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(payload: CreateInspectionRequest, reporterEmail?: string, changedBy?: string): Promise<InspectionEntity> {
    const email = (reporterEmail ?? '').trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Se requiere cabecera x-user-email para registrar la inspección.');
    }
    const reporter = await this.userRepository.findOne({ where: { email } });
    if (!reporter) {
      throw new BadRequestException('No existe un usuario activo con el correo de sesión.');
    }

    const { evidence, inspectionCode: _codeIn, reportedBy: _byIn, ...inspectionFields } = payload;
    const now = new Date();
    const reportYear = inspectionFields.reportYear ?? now.getFullYear();

    const saved = await this.inspectionRepository.manager.transaction(async (manager) => {
      const nextCode =
        _codeIn?.trim() || (await this.allocateNextInspectionCode(manager, reportYear));

      const inspection = manager.create(InspectionEntity, {
        reportYear,
        reportDay: inspectionFields.reportDay ?? now.getDate(),
        ...inspectionFields,
        inspectionCode: nextCode,
        reportedBy: reporter.fullName?.trim() || reporter.email,
        reportedByUserId: reporter.id,
        reportMonth: inspectionFields.reportMonth?.trim().toUpperCase() || this.monthName(now),
      } as Partial<InspectionEntity>);
      const s = await manager.save(inspection);

      if (evidence?.length) {
        for (const row of evidence) {
          await manager.save(
            InspectionResponseEntity,
            manager.create(InspectionResponseEntity, {
              inspectionCode: s.inspectionCode,
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
      entityType: 'inspection',
      entityId: saved.inspectionCode,
      action: 'create',
      changedBy,
      currentSnapshot: toSnapshot(saved),
    });

    return saved;
  }

  async findAll(query: SearchInspectionsRequest): Promise<InspectionEntity[]> {
    const qb = this.inspectionRepository.createQueryBuilder('inspection');
    this.applyFilters(qb, query);
    return qb.orderBy('inspection.createdAt', 'DESC').getMany();
  }

  async findPaged(query: SearchInspectionsRequest): Promise<{
    items: InspectionEntity[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }> {
    const qb = this.inspectionRepository.createQueryBuilder('inspection');
    this.applyFilters(qb, query);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [items, total] = await qb
      .orderBy('inspection.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async findByInspectionCode(inspectionCode: string): Promise<InspectionEntity | null> {
    return this.inspectionRepository.findOne({ where: { inspectionCode } });
  }

  async update(inspectionCode: string, dto: UpdateInspectionRequest, changedBy?: string): Promise<InspectionEntity> {
    const saved = await this.inspectionRepository.manager.transaction(async (manager) => {
      const inspection = await manager.findOne(InspectionEntity, { where: { inspectionCode } });
      if (!inspection) throw new NotFoundException('Inspección no encontrada');

      const previousSnapshot = toSnapshot(inspection);
      const { evidence, ...scalarUpdates } = dto;

      const assignable = [
        'reportYear', 'reportMonth', 'reportDay', 'reportTime',
        'site', 'reportedPerson', 'reportedPersonAge', 'employerType',
        'areaCode', 'leaderCode', 'assignedTo', 'location', 'workArea',
        'inspectionType', 'riskLevel', 'description', 'comment', 'reportSource',
        'correctiveMeasures', 'status',
      ] as const;

      for (const key of assignable) {
        const v = scalarUpdates[key];
        if (v !== undefined) {
          Object.assign(inspection, {
            [key]: key === 'reportMonth' && typeof v === 'string' ? v.trim().toUpperCase() : v,
          });
        }
      }

      const nextStatus = dto.status ?? inspection.status;
      if (nextStatus === 'closed') {
        const newClosureEvidence = (evidence ?? []).some(
          (e) => e.imageType === 'closure' && e.url.trim().length > 0,
        );
        const existingClosureCount = await manager.count(InspectionResponseEntity, {
          where: { inspectionCode, imageType: 'closure' },
        });
        if (!newClosureEvidence && existingClosureCount <= 0) {
          throw new BadRequestException('Para cerrar una inspección debes adjuntar evidencia de cierre');
        }
      }

      if (evidence?.length) {
        for (const row of evidence) {
          await manager.save(
            InspectionResponseEntity,
            manager.create(InspectionResponseEntity, {
              inspectionCode,
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

      const result = await manager.save(InspectionEntity, inspection);
      return { result, previousSnapshot };
    });

    await this.auditLog.log({
      entityType: 'inspection',
      entityId: inspectionCode,
      action: 'update',
      changedBy,
      previousSnapshot: saved.previousSnapshot,
      currentSnapshot: toSnapshot(saved.result),
    });

    return saved.result;
  }

  async remove(inspectionCode: string, changedBy?: string): Promise<void> {
    const inspection = await this.inspectionRepository.findOne({ where: { inspectionCode } });
    if (!inspection) throw new NotFoundException('Inspección no encontrada');

    const snapshot = toSnapshot(inspection);
    const result = await this.inspectionRepository.delete({ inspectionCode });
    if (!result.affected) throw new NotFoundException('Inspección no encontrada');

    await this.auditLog.log({
      entityType: 'inspection',
      entityId: inspectionCode,
      action: 'delete',
      changedBy,
      previousSnapshot: snapshot,
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private applyFilters(qb: ReturnType<Repository<InspectionEntity>['createQueryBuilder']>, query: SearchInspectionsRequest): void {
    const status = cleanFilter(query.status);
    const areaCode = cleanFilter(query.areaCode);
    const leaderCode = cleanFilter(query.leaderCode);
    const riskLevel = cleanFilter(query.riskLevel);
    const inspectionType = cleanFilter(query.inspectionType);
    const reportMonth = cleanFilter(query.reportMonth);

    if (status) qb.andWhere('inspection.status = :status', { status });
    if (areaCode) qb.andWhere('inspection.areaCode = :areaCode', { areaCode });
    if (leaderCode) qb.andWhere('inspection.leaderCode = :leaderCode', { leaderCode });
    if (riskLevel) qb.andWhere('inspection.riskLevel = :riskLevel', { riskLevel });
    if (inspectionType) qb.andWhere('inspection.inspectionType = :inspectionType', { inspectionType });
    if (reportMonth) {
      const monthNumber = this.monthNumber(reportMonth);
      qb.andWhere(
        '(UPPER(inspection.reportMonth) = :reportMonth OR (inspection.reportMonth IS NULL AND EXTRACT(MONTH FROM inspection.createdAt) = :monthNumber))',
        { reportMonth: reportMonth.toUpperCase(), monthNumber },
      );
    }
    if (query.reportYear) {
      qb.andWhere(
        '(inspection.reportYear = :reportYear OR (inspection.reportYear IS NULL AND EXTRACT(YEAR FROM inspection.createdAt) = :reportYear))',
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

  /** Correlativo anual atómico: INS-AAAA-NNNNN (tabla inspection_serial). */
  private async allocateNextInspectionCode(manager: EntityManager, year: number): Promise<string> {
    const rows = await manager.query(
      `INSERT INTO inspection_serial (year, last_value) VALUES ($1, 1)
       ON CONFLICT (year) DO UPDATE SET last_value = inspection_serial.last_value + 1
       RETURNING last_value`,
      [year],
    );
    const raw = rows[0] as { last_value?: number; lastValue?: number } | undefined;
    const n = Number(raw?.last_value ?? raw?.lastValue);
    if (!Number.isFinite(n) || n < 1) {
      throw new BadRequestException('No se pudo generar el código correlativo de inspección.');
    }
    return `INS-${year}-${String(n).padStart(5, '0')}`;
  }
}
