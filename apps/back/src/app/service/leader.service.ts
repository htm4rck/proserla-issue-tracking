import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderEntity } from '../entity/leader.entity';
import { CreateLeaderRequest } from '../mapper/leader.mapper';

@Injectable()
export class LeaderService {
  constructor(
    @InjectRepository(LeaderEntity)
    private readonly leaderRepository: Repository<LeaderEntity>,
  ) {}

  async create(payload: CreateLeaderRequest): Promise<LeaderEntity> {
    const leader = this.leaderRepository.create({ ...payload, isActive: payload.isActive ?? true });
    return this.leaderRepository.save(leader);
  }

  async findAll(): Promise<LeaderEntity[]> {
    return this.leaderRepository.find({ order: { createdAt: 'DESC' } });
  }
}
