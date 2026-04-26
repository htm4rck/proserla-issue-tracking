import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entity/user.entity';
import { CreateUserRequest } from '../mapper/user.mapper';
import { hashPassword } from '../security/password.util';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(payload: CreateUserRequest): Promise<UserEntity> {
    const { password, ...userFields } = payload;
    const user = this.userRepository.create({
      ...userFields,
      passwordHash: hashPassword(password || process.env.DEMO_DEFAULT_PASSWORD || 'demo1234'),
      isActive: payload.isActive ?? true,
    });
    return this.userRepository.save(user);
  }

  async findAll(): Promise<UserEntity[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async resetPassword(userId: string, newPassword: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    user.passwordHash = hashPassword(newPassword);
    return this.userRepository.save(user);
  }
}
