import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { RoleEntity } from '../entity/role.entity';

export class CreateRoleRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RoleResponse {
  id!: string;
  code!: string;
  name!: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class RoleMapper {
  static toResponse(entity: RoleEntity): RoleResponse {
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
