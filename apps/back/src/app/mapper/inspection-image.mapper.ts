import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { InspectionImageEntity } from '../entity/inspection-image.entity';
import { InspectionImageType } from '../enum/inspection-image-type.enum';

export class CreateInspectionImageRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  inspectionCode!: string;

  @IsString()
  @IsIn(Object.values(InspectionImageType))
  imageType!: InspectionImageType;

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
}

export class InspectionImageResponse {
  id!: string;
  inspectionCode!: string;
  imageType!: InspectionImageType;
  url!: string;
  storagePath?: string;
  uploadedBy?: string;
  createdAt!: Date;
}

export class InspectionImageMapper {
  static toResponse(entity: InspectionImageEntity): InspectionImageResponse {
    return {
      id: entity.id,
      inspectionCode: entity.inspectionCode,
      imageType: entity.imageType,
      url: entity.url,
      storagePath: entity.storagePath,
      uploadedBy: entity.uploadedBy,
      createdAt: entity.createdAt,
    };
  }
}
