import { IsArray, IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LeaderEntity } from '../entity/leader.entity';
import { LeaderAreaEntity } from '../entity/leader-area.entity';

// ── Área dentro de un líder ───────────────────────────────────────────────────

export class LeaderAreaRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  areaCode!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class LeaderAreaResponse {
  id!: string;
  areaCode!: string;
  isPrimary!: boolean;
}

// ── Crear líder ───────────────────────────────────────────────────────────────

export class CreateLeaderRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  /**
   * Área primaria (compatibilidad). Si se envía `areas`, se toma de ahí.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  areaCode!: string;

  /**
   * Áreas adicionales del líder. Opcional.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaderAreaRequest)
  areas?: LeaderAreaRequest[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Agregar / quitar área a líder existente ───────────────────────────────────

export class AddLeaderAreaRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  areaCode!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class RemoveLeaderAreaRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  areaCode!: string;
}

// ── Respuestas ────────────────────────────────────────────────────────────────

export class LeaderResponse {
  id!: string;
  code!: string;
  fullName!: string;
  email?: string;
  /** Área primaria (fallback) */
  areaCode!: string;
  /** Todas las áreas del líder */
  areas!: LeaderAreaResponse[];
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export class LeaderMapper {
  static toResponse(entity: LeaderEntity, areas: LeaderAreaEntity[] = []): LeaderResponse {
    return {
      id: entity.id,
      code: entity.code,
      fullName: entity.fullName,
      email: entity.email,
      areaCode: entity.areaCode,
      areas: areas.map((a) => ({
        id: a.id,
        areaCode: a.areaCode,
        isPrimary: a.isPrimary,
      })),
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
