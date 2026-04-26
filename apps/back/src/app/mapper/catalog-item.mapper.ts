import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CatalogItemEntity } from '../entity/catalog-item.entity';

export class CreateCatalogItemRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  catalogType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CatalogItemResponse {
  id!: string;
  catalogType!: string;
  code!: string;
  label!: string;
  description?: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CatalogItemMapper {
  static toResponse(entity: CatalogItemEntity): CatalogItemResponse {
    return {
      id: entity.id,
      catalogType: entity.catalogType,
      code: entity.code,
      label: entity.label,
      description: entity.description,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
