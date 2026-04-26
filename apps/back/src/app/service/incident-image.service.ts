import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidentResponseEntity } from '../entity/incident-response.entity';
import { IncidentStatus } from '../enum/incident-status.enum';

export interface CreateResponsePayload {
  incidentCode: string;
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
export class IncidentImageService {
  constructor(
    @InjectRepository(IncidentResponseEntity)
    private readonly repo: Repository<IncidentResponseEntity>,
  ) {}

  async create(payload: CreateResponsePayload): Promise<IncidentResponseEntity> {
    const status = this.normalizeStatus(payload.status);
    const entity = this.repo.create({
      incidentCode: payload.incidentCode,
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

  private normalizeStatus(raw: string): IncidentStatus {
    const s = (raw ?? '').trim().toLowerCase();
    if (s === IncidentStatus.IN_PROGRESS) return IncidentStatus.IN_PROGRESS;
    if (s === IncidentStatus.CLOSED) return IncidentStatus.CLOSED;
    return IncidentStatus.OPEN;
  }

  async findByIncidentCode(incidentCode: string): Promise<IncidentResponseEntity[]> {
    return this.repo.find({ where: { incidentCode }, order: { createdAt: 'DESC' } });
  }
}
