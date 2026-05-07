import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InspectionResponseEntity } from '../entity/inspection-response.entity';
import { InspectionStatus } from '../enum/inspection-status.enum';

export interface CreateResponsePayload {
  inspectionCode: string;
  status: string;
  imageType: string;
  url: string;
  storagePath?: string;
  uploadedBy?: string;
  comment?: string;
  uploadOk?: boolean;
  uploadError?: string;
}

@Injectable()
export class InspectionImageService {
  constructor(
    @InjectRepository(InspectionResponseEntity)
    private readonly repo: Repository<InspectionResponseEntity>,
  ) {}

  async create(payload: CreateResponsePayload): Promise<InspectionResponseEntity> {
    const status = this.normalizeStatus(payload.status);
    const entity = this.repo.create({
      inspectionCode: payload.inspectionCode,
      status,
      imageType: payload.imageType,
      url: payload.url,
      storagePath: payload.storagePath,
      uploadedBy: payload.uploadedBy,
      comment: payload.comment,
      uploadOk: payload.uploadOk ?? true,
      uploadError: payload.uploadError,
    });
    return this.repo.save(entity);
  }

  private normalizeStatus(raw: string): InspectionStatus {
    const s = (raw ?? '').trim().toLowerCase();
    if (s === InspectionStatus.IN_PROGRESS) return InspectionStatus.IN_PROGRESS;
    if (s === InspectionStatus.CLOSED) return InspectionStatus.CLOSED;
    return InspectionStatus.OPEN;
  }

  async findByInspectionCode(inspectionCode: string): Promise<InspectionResponseEntity[]> {
    return this.repo.find({ where: { inspectionCode }, order: { createdAt: 'DESC' } });
  }
}
