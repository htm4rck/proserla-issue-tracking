import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderEntity } from '../entity/leader.entity';
import { UserEntity } from '../entity/user.entity';
import {
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginRequest,
  LoginResponse,
} from '../mapper/auth.mapper';
import { hashPassword, verifyPassword } from '../security/password.util';

const DEFAULT_DEMO_PASSWORD = 'demo1234';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(LeaderEntity)
    private readonly leaderRepository: Repository<LeaderEntity>,
  ) {}

  async login(payload: LoginRequest): Promise<LoginResponse> {
    if (!payload.email) {
      throw new UnauthorizedException('El correo es obligatorio');
    }

    const user = await this.userRepository.findOne({
      where: { email: payload.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales no válidas');
    }

    const fallbackPassword = process.env.DEMO_DEFAULT_PASSWORD ?? DEFAULT_DEMO_PASSWORD;
    const validPassword = user.passwordHash
      ? verifyPassword(payload.password, user.passwordHash)
      : payload.password === fallbackPassword;

    if (!validPassword) {
      throw new UnauthorizedException('Credenciales no válidas');
    }

    const leaderCode =
      user.leaderCode ??
      (
        await this.leaderRepository.findOne({
          where: [{ email: user.email }, { fullName: user.fullName }],
        })
      )?.code;

    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    return {
      token,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      roleCode: user.roleCode,
      areaCode: user.areaCode,
      leaderCode,
    };
  }

  async changePassword(payload: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const user = await this.userRepository.findOne({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no válido');
    }

    const fallbackPassword = process.env.DEMO_DEFAULT_PASSWORD ?? DEFAULT_DEMO_PASSWORD;
    const validCurrentPassword = user.passwordHash
      ? verifyPassword(payload.currentPassword, user.passwordHash)
      : payload.currentPassword === fallbackPassword;

    if (!validCurrentPassword) {
      throw new UnauthorizedException('La contraseña actual no es válida');
    }

    user.passwordHash = hashPassword(payload.newPassword);
    const saved = await this.userRepository.save(user);
    return { userId: saved.id, updatedAt: saved.updatedAt };
  }
}
