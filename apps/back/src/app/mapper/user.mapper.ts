import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { UserEntity } from '../entity/user.entity';
import { UserAreaEntity } from '../entity/user-area.entity';

// ── Área dentro de un usuario ─────────────────────────────────────────────────

export class UserAreaRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  areaCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  leaderCode?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UserAreaResponse {
  id!: string;
  areaCode!: string;
  leaderCode?: string;
  isPrimary!: boolean;
}

// ── Crear usuario ─────────────────────────────────────────────────────────────

export class CreateUserRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  roleCode!: string;

  /**
   * Área primaria (compatibilidad y fallback de sesión).
   * Si se envía `areas`, el área primaria se toma de ahí (isPrimary=true).
   * Si solo se envía `areaCode`, se crea automáticamente una entrada en user_areas.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  areaCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  leaderCode?: string;

  /**
   * Áreas adicionales del usuario. Opcional.
   * Si se omite, se usa areaCode + leaderCode como única área.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserAreaRequest)
  areas?: UserAreaRequest[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Agregar / quitar área a usuario existente ─────────────────────────────────

export class AddUserAreaRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  areaCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  leaderCode?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class RemoveUserAreaRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  areaCode!: string;
}

// ── Respuestas ────────────────────────────────────────────────────────────────

export class UserResponse {
  id!: string;
  email!: string;
  fullName!: string;
  roleCode!: string;
  /** Área primaria (fallback) */
  areaCode!: string;
  /** Líder del área primaria (fallback) */
  leaderCode?: string;
  /** Todas las áreas del usuario */
  areas!: UserAreaResponse[];
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ResetUserPasswordRequest {
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  newPassword!: string;
}

export class ResetUserPasswordResponse {
  userId!: string;
  email!: string;
  updatedAt!: Date;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export class UserMapper {
  static toResponse(entity: UserEntity, areas: UserAreaEntity[] = []): UserResponse {
    return {
      id: entity.id,
      email: entity.email,
      fullName: entity.fullName,
      roleCode: entity.roleCode,
      areaCode: entity.areaCode,
      leaderCode: entity.leaderCode,
      areas: areas.map((a) => ({
        id: a.id,
        areaCode: a.areaCode,
        leaderCode: a.leaderCode,
        isPrimary: a.isPrimary,
      })),
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
