import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderAreaEntity } from '../entity/leader-area.entity';
import { LeaderEntity } from '../entity/leader.entity';
import { AddLeaderAreaRequest, CreateLeaderRequest, RemoveLeaderAreaRequest } from '../mapper/leader.mapper';

@Injectable()
export class LeaderService {
  constructor(
    @InjectRepository(LeaderEntity)
    private readonly leaderRepository: Repository<LeaderEntity>,
    @InjectRepository(LeaderAreaEntity)
    private readonly leaderAreaRepository: Repository<LeaderAreaEntity>,
  ) {}

  // ── Crear líder ─────────────────────────────────────────────────────────────

  async create(payload: CreateLeaderRequest): Promise<{ leader: LeaderEntity; areas: LeaderAreaEntity[] }> {
    const { areas, ...leaderFields } = payload;

    const leader = this.leaderRepository.create({
      ...leaderFields,
      isActive: payload.isActive ?? true,
    });
    const savedLeader = await this.leaderRepository.save(leader);

    const areaEntries = this.buildAreaEntries(savedLeader.code, payload.areaCode, areas);
    const savedAreas = await this.leaderAreaRepository.save(areaEntries);

    return { leader: savedLeader, areas: savedAreas };
  }

  // ── Listar líderes con sus áreas ────────────────────────────────────────────

  async findAll(): Promise<{ leader: LeaderEntity; areas: LeaderAreaEntity[] }[]> {
    const leaders = await this.leaderRepository.find({ order: { createdAt: 'DESC' } });
    if (leaders.length === 0) return [];

    const codes = leaders.map((l) => l.code);
    const allAreas = await this.leaderAreaRepository
      .createQueryBuilder('la')
      .where('la.leaderCode IN (:...codes)', { codes })
      .orderBy('la.isPrimary', 'DESC')
      .addOrderBy('la.createdAt', 'ASC')
      .getMany();

    const areasByLeader = new Map<string, LeaderAreaEntity[]>();
    for (const la of allAreas) {
      const list = areasByLeader.get(la.leaderCode) ?? [];
      list.push(la);
      areasByLeader.set(la.leaderCode, list);
    }

    return leaders.map((leader) => ({ leader, areas: areasByLeader.get(leader.code) ?? [] }));
  }

  // ── Agregar área a líder existente ──────────────────────────────────────────

  async addArea(leaderCode: string, payload: AddLeaderAreaRequest): Promise<LeaderAreaEntity[]> {
    const leader = await this.leaderRepository.findOne({ where: { code: leaderCode } });
    if (!leader) throw new NotFoundException('Líder no encontrado');

    const existing = await this.leaderAreaRepository.findOne({
      where: { leaderCode, areaCode: payload.areaCode },
    });
    if (existing) throw new BadRequestException(`El líder ya tiene asignada el área ${payload.areaCode}`);

    if (payload.isPrimary) {
      await this.leaderAreaRepository.update({ leaderCode, isPrimary: true }, { isPrimary: false });
      leader.areaCode = payload.areaCode;
      await this.leaderRepository.save(leader);
    }

    await this.leaderAreaRepository.save(
      this.leaderAreaRepository.create({
        leaderCode,
        areaCode: payload.areaCode,
        isPrimary: payload.isPrimary ?? false,
      }),
    );

    return this.getAreasForLeader(leaderCode);
  }

  // ── Quitar área de líder ────────────────────────────────────────────────────

  async removeArea(leaderCode: string, payload: RemoveLeaderAreaRequest): Promise<LeaderAreaEntity[]> {
    const leader = await this.leaderRepository.findOne({ where: { code: leaderCode } });
    if (!leader) throw new NotFoundException('Líder no encontrado');

    const entry = await this.leaderAreaRepository.findOne({
      where: { leaderCode, areaCode: payload.areaCode },
    });
    if (!entry) throw new NotFoundException(`El líder no tiene asignada el área ${payload.areaCode}`);

    const totalAreas = await this.leaderAreaRepository.count({ where: { leaderCode } });
    if (totalAreas <= 1) throw new BadRequestException('El líder debe tener al menos un área asignada');

    await this.leaderAreaRepository.remove(entry);

    if (entry.isPrimary) {
      const next = await this.leaderAreaRepository.findOne({
        where: { leaderCode },
        order: { createdAt: 'ASC' },
      });
      if (next) {
        next.isPrimary = true;
        await this.leaderAreaRepository.save(next);
        leader.areaCode = next.areaCode;
        await this.leaderRepository.save(leader);
      }
    }

    return this.getAreasForLeader(leaderCode);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async getAreasForLeader(leaderCode: string): Promise<LeaderAreaEntity[]> {
    return this.leaderAreaRepository.find({
      where: { leaderCode },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  private buildAreaEntries(
    leaderCode: string,
    primaryAreaCode: string,
    areas?: Array<{ areaCode: string; isPrimary?: boolean }>,
  ): LeaderAreaEntity[] {
    if (areas && areas.length > 0) {
      const hasPrimary = areas.some((a) => a.isPrimary);
      return areas.map((a, idx) =>
        this.leaderAreaRepository.create({
          leaderCode,
          areaCode: a.areaCode,
          isPrimary: a.isPrimary ?? (!hasPrimary && idx === 0),
        }),
      );
    }

    return [
      this.leaderAreaRepository.create({
        leaderCode,
        areaCode: primaryAreaCode,
        isPrimary: true,
      }),
    ];
  }
}
