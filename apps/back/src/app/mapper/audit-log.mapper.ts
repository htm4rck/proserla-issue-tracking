import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AuditLogEntity } from '../entity/audit-log.entity';

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const t = value.trim().toLowerCase();
  return t && t !== 'undefined' && t !== 'null' ? value.trim() : undefined;
}

export class AuditLogFilterRequest {
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  entityType?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsString()
  entityId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class AuditLogListItem {
  id!: string;
  entityType!: string;
  entityId!: string;
  action!: string;
  changeLabel?: string;
  previousValue?: string;
  nextValue?: string;
  changedBy?: string;
  createdAt!: Date;
}

export class AuditLogDetail extends AuditLogListItem {
  previousSnapshot?: Record<string, unknown>;
  diff?: Record<string, { from: unknown; to: unknown }>;
}

export class AuditLogMapper {
  static toListItem(e: AuditLogEntity): AuditLogListItem {
    return {
      id: e.id,
      entityType: e.entityType,
      entityId: e.entityId,
      action: e.action,
      changeLabel: e.changeLabel,
      previousValue: e.previousValue,
      nextValue: e.nextValue,
      changedBy: e.changedBy,
      createdAt: e.createdAt,
    };
  }

  static toDetail(e: AuditLogEntity): AuditLogDetail {
    return {
      ...AuditLogMapper.toListItem(e),
      previousSnapshot: e.previousSnapshot,
      diff: e.diff,
    };
  }
}
