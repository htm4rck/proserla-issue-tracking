import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../entity/role.entity';
import { CreateRoleRequest } from '../mapper/role.mapper';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async create(payload: CreateRoleRequest): Promise<RoleEntity> {
    const role = this.roleRepository.create({ ...payload, isActive: payload.isActive ?? true });
    return this.roleRepository.save(role);
  }

  async findAll(): Promise<RoleEntity[]> {
    return this.roleRepository.find({ order: { createdAt: 'DESC' } });
  }
}
