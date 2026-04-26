import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentStatus } from '../enum/incident-status.enum';

function emptyQueryToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  return trimmed && lower !== 'undefined' && lower !== 'null' ? trimmed : undefined;
}

function queryNumberToUndefined(value: unknown): number | undefined {
  const clean = emptyQueryToUndefined(value);
  if (clean === undefined || clean === null) return undefined;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export class IncidentEvidenceInput {
  @IsString()
  @IsIn(['report', 'closure'])
  imageType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  storagePath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  uploadedBy?: string;

  /** Comentario/observación de esta respuesta */
  @IsOptional()
  @IsString()
  comment?: string;

  /** Resultado del upload al PHP bridge */
  @IsOptional()
  uploadOk?: boolean;

  @IsOptional()
  @IsString()
  uploadError?: string;
}

export class CreateIncidentRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  incidentCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  reportedBy!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  reportYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  reportMonth?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  reportDay?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  reportTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  site?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  reportedPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  reportedPersonAge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  employerType?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  areaCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  leaderCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  assignedTo?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  location!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  workArea?: string;

  @IsString()
  @IsIn(['act', 'condition'])
  incidentType!: string;

  @IsString()
  @IsIn(['low', 'medium', 'high'])
  riskLevel!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reportSource?: string;

  @IsOptional()
  @IsString()
  correctiveMeasures?: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(IncidentStatus))
  status?: IncidentStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IncidentEvidenceInput)
  evidence?: IncidentEvidenceInput[];
}

export class UpdateIncidentRequest {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  reportedBy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  reportYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  reportMonth?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  reportDay?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  reportTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  site?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  reportedPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  reportedPersonAge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  employerType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  areaCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  leaderCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  assignedTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  workArea?: string;

  @IsOptional()
  @IsString()
  @IsIn(['act', 'condition'])
  incidentType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high'])
  riskLevel?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reportSource?: string;

  @IsOptional()
  @IsString()
  correctiveMeasures?: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(IncidentStatus))
  status?: IncidentStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IncidentEvidenceInput)
  evidence?: IncidentEvidenceInput[];
}

export class SearchIncidentsRequest {
  @IsOptional()
  @Transform(({ value }) => emptyQueryToUndefined(value))
  @IsIn(Object.values(IncidentStatus))
  status?: IncidentStatus;

  @IsOptional()
  @Transform(({ value }) => emptyQueryToUndefined(value))
  @IsString()
  areaCode?: string;

  @IsOptional()
  @Transform(({ value }) => emptyQueryToUndefined(value))
  @IsString()
  leaderCode?: string;

  @IsOptional()
  @Transform(({ value }) => emptyQueryToUndefined(value))
  @IsString()
  riskLevel?: string;

  @IsOptional()
  @Transform(({ value }) => emptyQueryToUndefined(value))
  @IsString()
  incidentType?: string;

  @IsOptional()
  @Transform(({ value }) => emptyQueryToUndefined(value))
  @IsString()
  reportMonth?: string;

  @IsOptional()
  @Transform(({ value }) => queryNumberToUndefined(value))
  @IsInt()
  reportYear?: number;

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

export class PaginatedIncidentsResponse {
  items!: IncidentResponse[];
  page!: number;
  pageSize!: number;
  total!: number;
  totalPages!: number;
}

export class IncidentResponse {
  id!: string;
  incidentCode!: string;
  reportedBy!: string;
  reportYear?: number;
  reportMonth?: string;
  reportDay?: number;
  reportTime?: string;
  site?: string;
  reportedPerson?: string;
  reportedPersonAge?: string;
  employerType?: string;
  areaCode!: string;
  leaderCode?: string;
  assignedTo?: string;
  location!: string;
  workArea?: string;
  incidentType!: string;
  riskLevel!: string;
  description!: string;
  comment?: string;
  reportSource?: string;
  correctiveMeasures?: string;
  status!: IncidentStatus;
  createdAt!: Date;
  updatedAt!: Date;
}

export class IncidentMapper {
  static toResponse(entity: IncidentEntity): IncidentResponse {
    return {
      id: entity.id,
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
}

