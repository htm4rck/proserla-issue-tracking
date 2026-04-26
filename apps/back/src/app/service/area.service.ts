import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaEntity } from '../entity/area.entity';
import { CreateAreaRequest } from '../mapper/area.mapper';

@Injectable()
export class AreaService {
  constructor(
    @InjectRepository(AreaEntity)
    private readonly areaRepository: Repository<AreaEntity>,
  ) {}

  async create(payload: CreateAreaRequest): Promise<AreaEntity> {
    const area = this.areaRepository.create({ ...payload, isActive: payload.isActive ?? true });
    return this.areaRepository.save(area);
  }

  async findAll(): Promise<AreaEntity[]> {
    return this.areaRepository.find({ order: { createdAt: 'DESC' } });
  }
}
