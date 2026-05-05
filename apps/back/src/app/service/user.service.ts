import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAreaEntity } from '../entity/user-area.entity';
import { UserEntity } from '../entity/user.entity';
import { AddUserAreaRequest, CreateUserRequest, RemoveUserAreaRequest } from '../mapper/user.mapper';
import { hashPassword } from '../security/password.util';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserAreaEntity)
    private readonly userAreaRepository: Repository<UserAreaEntity>,
  ) {}

  // ── Crear usuario ───────────────────────────────────────────────────────────

  async create(payload: CreateUserRequest): Promise<{ user: UserEntity; areas: UserAreaEntity[] }> {
    const { password, areas, ...userFields } = payload;

    const user = this.userRepository.create({
      ...userFields,
      passwordHash: hashPassword(password || process.env.DEMO_DEFAULT_PASSWORD || 'demo1234'),
      isActive: payload.isActive ?? true,
    });
    const savedUser = await this.userRepository.save(user);

    // Construir entradas de user_areas
    const areaEntries = this.buildAreaEntries(savedUser.id, payload.areaCode, payload.leaderCode, areas);
    const savedAreas = await this.userAreaRepository.save(areaEntries);

    return { user: savedUser, areas: savedAreas };
  }

  // ── Listar usuarios con sus áreas ───────────────────────────────────────────

  async findAll(): Promise<{ user: UserEntity; areas: UserAreaEntity[] }[]> {
    const users = await this.userRepository.find({ order: { createdAt: 'DESC' } });
    if (users.length === 0) return [];

    const userIds = users.map((u) => u.id);
    const allAreas = await this.userAreaRepository
      .createQueryBuilder('ua')
      .where('ua.userId IN (:...userIds)', { userIds })
      .orderBy('ua.isPrimary', 'DESC')
      .addOrderBy('ua.createdAt', 'ASC')
      .getMany();

    const areasByUser = new Map<string, UserAreaEntity[]>();
    for (const ua of allAreas) {
      const list = areasByUser.get(ua.userId) ?? [];
      list.push(ua);
      areasByUser.set(ua.userId, list);
    }

    return users.map((user) => ({ user, areas: areasByUser.get(user.id) ?? [] }));
  }

  // ── Agregar área a usuario existente ────────────────────────────────────────

  async addArea(userId: string, payload: AddUserAreaRequest): Promise<UserAreaEntity[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const existing = await this.userAreaRepository.findOne({
      where: { userId, areaCode: payload.areaCode },
    });
    if (existing) throw new BadRequestException(`El usuario ya tiene asignada el área ${payload.areaCode}`);

    // Si se marca como primaria, quitar la primaria anterior
    if (payload.isPrimary) {
      await this.userAreaRepository.update({ userId, isPrimary: true }, { isPrimary: false });
      user.areaCode = payload.areaCode;
      user.leaderCode = payload.leaderCode;
      await this.userRepository.save(user);
    }

    await this.userAreaRepository.save(
      this.userAreaRepository.create({
        userId,
        areaCode: payload.areaCode,
        leaderCode: payload.leaderCode,
        isPrimary: payload.isPrimary ?? false,
      }),
    );

    return this.getAreasForUser(userId);
  }

  // ── Quitar área de usuario ──────────────────────────────────────────────────

  async removeArea(userId: string, payload: RemoveUserAreaRequest): Promise<UserAreaEntity[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const entry = await this.userAreaRepository.findOne({
      where: { userId, areaCode: payload.areaCode },
    });
    if (!entry) throw new NotFoundException(`El usuario no tiene asignada el área ${payload.areaCode}`);

    const totalAreas = await this.userAreaRepository.count({ where: { userId } });
    if (totalAreas <= 1) throw new BadRequestException('El usuario debe tener al menos un área asignada');

    await this.userAreaRepository.remove(entry);

    // Si se eliminó la primaria, promover la siguiente
    if (entry.isPrimary) {
      const next = await this.userAreaRepository.findOne({
        where: { userId },
        order: { createdAt: 'ASC' },
      });
      if (next) {
        next.isPrimary = true;
        await this.userAreaRepository.save(next);
        user.areaCode = next.areaCode;
        user.leaderCode = next.leaderCode;
        await this.userRepository.save(user);
      }
    }

    return this.getAreasForUser(userId);
  }

  // ── Cambiar área primaria ───────────────────────────────────────────────────

  async setPrimaryArea(userId: string, areaCode: string): Promise<UserAreaEntity[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const entry = await this.userAreaRepository.findOne({ where: { userId, areaCode } });
    if (!entry) throw new NotFoundException(`El usuario no tiene asignada el área ${areaCode}`);

    await this.userAreaRepository.update({ userId, isPrimary: true }, { isPrimary: false });
    entry.isPrimary = true;
    await this.userAreaRepository.save(entry);

    user.areaCode = areaCode;
    user.leaderCode = entry.leaderCode;
    await this.userRepository.save(user);

    return this.getAreasForUser(userId);
  }

  // ── Reset de contraseña ─────────────────────────────────────────────────────

  async resetPassword(userId: string, newPassword: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.passwordHash = hashPassword(newPassword);
    return this.userRepository.save(user);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async getAreasForUser(userId: string): Promise<UserAreaEntity[]> {
    return this.userAreaRepository.find({
      where: { userId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Construye las entradas de user_areas a partir del payload de creación.
   * Si se envía `areas`, las usa (marcando la primera como primaria si ninguna lo es).
   * Si no, crea una sola entrada con areaCode + leaderCode como primaria.
   */
  private buildAreaEntries(
    userId: string,
    primaryAreaCode: string,
    primaryLeaderCode: string | undefined,
    areas?: Array<{ areaCode: string; leaderCode?: string; isPrimary?: boolean }>,
  ): UserAreaEntity[] {
    if (areas && areas.length > 0) {
      const hasPrimary = areas.some((a) => a.isPrimary);
      return areas.map((a, idx) =>
        this.userAreaRepository.create({
          userId,
          areaCode: a.areaCode,
          leaderCode: a.leaderCode,
          isPrimary: a.isPrimary ?? (!hasPrimary && idx === 0),
        }),
      );
    }

    return [
      this.userAreaRepository.create({
        userId,
        areaCode: primaryAreaCode,
        leaderCode: primaryLeaderCode,
        isPrimary: true,
      }),
    ];
  }
}
