import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { WorkSiteEntity } from '../entity/work-site.entity';

export class CreateWorkSiteRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class WorkSiteResponse {
  id!: string;
  code!: string;
  name!: string;
  sortOrder!: number;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class WorkSiteMapper {
  static toResponse(entity: WorkSiteEntity): WorkSiteResponse {
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      sortOrder: entity.sortOrder,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
