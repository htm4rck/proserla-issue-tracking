import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IncidentImageEntity } from '../entity/incident-image.entity';
import { IncidentImageType } from '../enum/incident-image-type.enum';

export class CreateIncidentImageRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  incidentCode!: string;

  @IsString()
  @IsIn(Object.values(IncidentImageType))
  imageType!: IncidentImageType;

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

export class IncidentImageResponse {
  id!: string;
  incidentCode!: string;
  imageType!: IncidentImageType;
  url!: string;
  storagePath?: string;
  uploadedBy?: string;
  createdAt!: Date;
}

export class IncidentImageMapper {
  static toResponse(entity: IncidentImageEntity): IncidentImageResponse {
    return {
      id: entity.id,
      incidentCode: entity.incidentCode,
      imageType: entity.imageType,
      url: entity.url,
      storagePath: entity.storagePath,
      uploadedBy: entity.uploadedBy,
      createdAt: entity.createdAt,
    };
  }
}
