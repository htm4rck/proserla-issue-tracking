import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogItemEntity } from '../entity/catalog-item.entity';
import { CreateCatalogItemRequest } from '../mapper/catalog-item.mapper';

@Injectable()
export class CatalogItemService {
  constructor(
    @InjectRepository(CatalogItemEntity)
    private readonly catalogItemRepository: Repository<CatalogItemEntity>,
  ) {}

  async create(payload: CreateCatalogItemRequest): Promise<CatalogItemEntity> {
    const item = this.catalogItemRepository.create({ ...payload, isActive: payload.isActive ?? true });
    return this.catalogItemRepository.save(item);
  }

  async findAll(): Promise<CatalogItemEntity[]> {
    return this.catalogItemRepository.find({ order: { createdAt: 'DESC' } });
  }
}
