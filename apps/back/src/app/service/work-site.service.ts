import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkSiteEntity } from '../entity/work-site.entity';
import { CreateWorkSiteRequest } from '../mapper/work-site.mapper';

@Injectable()
export class WorkSiteService {
  constructor(
    @InjectRepository(WorkSiteEntity)
    private readonly repo: Repository<WorkSiteEntity>,
  ) {}

  async findAllActive(): Promise<WorkSiteEntity[]> {
    return this.repo.find({ where: { isActive: true }, order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async findAll(): Promise<WorkSiteEntity[]> {
    return this.repo.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async create(payload: CreateWorkSiteRequest): Promise<WorkSiteEntity> {
    const entity = this.repo.create({
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
    });
    return this.repo.save(entity);
  }
}
