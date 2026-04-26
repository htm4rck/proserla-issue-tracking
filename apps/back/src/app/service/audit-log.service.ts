import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../entity/audit-log.entity';

export interface AuditLogCreateParams {
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  changedBy?: string;
  previousSnapshot?: Record<string, unknown>;
  currentSnapshot?: Record<string, unknown>;
}

function computeDiff(
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  for (const key of keys) {
    const from = prev[key];
    const to = curr[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      diff[key] = { from, to };
    }
  }
  return diff;
}

function detectMainChange(
  diff: Record<string, { from: unknown; to: unknown }>,
): { changeLabel: string; previousValue: string; nextValue: string } | null {
  // Prioridad: status > assignedTo > riskLevel > otros
  const priority = ['status', 'assignedTo', 'riskLevel', 'incidentType', 'areaCode', 'leaderCode'];
  for (const key of priority) {
    if (diff[key]) {
      return {
        changeLabel: key,
        previousValue: String(diff[key].from ?? ''),
        nextValue: String(diff[key].to ?? ''),
      };
    }
  }
  const first = Object.keys(diff)[0];
  if (!first) return null;
  return {
    changeLabel: first,
    previousValue: String(diff[first].from ?? ''),
    nextValue: String(diff[first].to ?? ''),
  };
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
  ) {}

  async log(params: AuditLogCreateParams): Promise<void> {
    const { entityType, entityId, action, changedBy, previousSnapshot, currentSnapshot } = params;

    let diff: Record<string, { from: unknown; to: unknown }> | undefined;
    let changeLabel: string | undefined;
    let previousValue: string | undefined;
    let nextValue: string | undefined;

    if (action === 'update' && previousSnapshot && currentSnapshot) {
      diff = computeDiff(previousSnapshot, currentSnapshot);
      const main = detectMainChange(diff);
      if (main) {
        changeLabel = main.changeLabel;
        previousValue = main.previousValue;
        nextValue = main.nextValue;
      }
    } else if (action === 'create') {
      changeLabel = 'created';
      nextValue = entityId;
    } else if (action === 'delete') {
      changeLabel = 'deleted';
      previousValue = entityId;
    }

    const entry = this.repo.create({
      entityType,
      entityId,
      action,
      changedBy,
      changeLabel,
      previousValue,
      nextValue,
      previousSnapshot,
      diff,
    });

    await this.repo.save(entry);
  }

  async findById(id: string): Promise<AuditLogEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(params: {
    entityType?: string;
    entityId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: AuditLogEntity[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 30;
    const qb = this.repo.createQueryBuilder('log');

    if (params.entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType: params.entityType });
    }
    if (params.entityId) {
      qb.andWhere('log.entityId = :entityId', { entityId: params.entityId });
    }

    const [items, total] = await qb
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }
}
