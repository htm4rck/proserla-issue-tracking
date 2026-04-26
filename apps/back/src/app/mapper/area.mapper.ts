import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AreaEntity } from '../entity/area.entity';

export class CreateAreaRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AreaResponse {
  id!: string;
  code!: string;
  name!: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AreaMapper {
  static toResponse(entity: AreaEntity): AreaResponse {
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
