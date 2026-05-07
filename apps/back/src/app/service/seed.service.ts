import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaEntity } from '../entity/area.entity';
import { CatalogItemEntity } from '../entity/catalog-item.entity';
import { InspectionImageEntity } from '../entity/inspection-image.entity';
import { InspectionEntity } from '../entity/inspection.entity';
import { LeaderAreaEntity } from '../entity/leader-area.entity';
import { LeaderEntity } from '../entity/leader.entity';
import { RoleEntity } from '../entity/role.entity';
import { UserAreaEntity } from '../entity/user-area.entity';
import { UserEntity } from '../entity/user.entity';
import { WorkSiteEntity } from '../entity/work-site.entity';
import { InspectionImageType } from '../enum/inspection-image-type.enum';
import { InspectionStatus } from '../enum/inspection-status.enum';
import {
  SEED_AREAS,
  SEED_DEMO_USERS,
  SEED_INSPECTIONS,
  SEED_LEADERS,
  SEED_ROLES,
} from './seed.data';
import { SeedRunPayload } from './seed.types';
import { hashPassword } from '../security/password.util';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(RoleEntity) private readonly roles: Repository<RoleEntity>,
    @InjectRepository(AreaEntity) private readonly areas: Repository<AreaEntity>,
    @InjectRepository(LeaderEntity) private readonly leaders: Repository<LeaderEntity>,
    @InjectRepository(LeaderAreaEntity) private readonly leaderAreas: Repository<LeaderAreaEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(UserAreaEntity) private readonly userAreas: Repository<UserAreaEntity>,
    @InjectRepository(CatalogItemEntity) private readonly catalogs: Repository<CatalogItemEntity>,
    @InjectRepository(InspectionEntity) private readonly inspections: Repository<InspectionEntity>,
    @InjectRepository(InspectionImageEntity) private readonly inspectionImages: Repository<InspectionImageEntity>,
    @InjectRepository(WorkSiteEntity) private readonly workSites: Repository<WorkSiteEntity>,
  ) {}

  async run(): Promise<SeedRunPayload> {
    await this.seedRoles();
    await this.seedAreas();
    await this.seedLeaders();
    await this.seedUsers();
    await this.seedCatalogs();
    await this.seedWorkSites();
    await this.seedInspections();
    await this.syncInspectionSerialFromExisting();
    this.logger.log('Semilla de datos completada');

    return this.buildPayload();
  }

  async runIfEnabled(): Promise<void> {
    if (process.env.SEED_ON_BOOT !== 'true') return;
    await this.run();
  }

  private async buildPayload(): Promise<SeedRunPayload> {
    const [roles, areas, lideres, usuarios, catalogos, inspecciones] = await Promise.all([
      this.roles.count(),
      this.areas.count(),
      this.leaders.count(),
      this.users.count(),
      this.catalogs.count(),
      this.inspections.count(),
    ]);

    return {
      resumen:
        'Datos de demostracion listos. Rol = permisos en la app. Area = lugar organizacional. Lider = persona responsable de un area. Cada usuario tiene rol + area + lider de referencia.',
      comoLeerElModelo: [
        {
          titulo: 'Rol',
          texto:
            'Define que puede hacer en el sistema (administrador global, lider de area u operador). No sustituye al lider humano: combinalo con area y lider.',
        },
        {
          titulo: 'Area',
          texto:
            'Unidad donde ocurre el trabajo (empaque, planta, campo). Las incidencias y muchos usuarios van etiquetados con un codigo de area.',
        },
        {
          titulo: 'Lider',
          texto:
            'Persona responsable de un area concreta. Un area puede tener un lider principal en esta demo; los usuarios operador suelen apuntar al lider de su area.',
        },
      ],
      roles: SEED_ROLES,
      areas: SEED_AREAS,
      lideres: SEED_LEADERS,
      usuariosDemo: SEED_DEMO_USERS,
      inspeccionesDemo: SEED_INSPECTIONS.slice(0, 8).map(
        (i) => `${i.inspectionCode} (${i.status}, ${i.areaCode}, ${i.reportMonth})`,
      ),
      conteos: {
        roles,
        areas,
        lideres,
        usuarios,
        catalogos,
        inspecciones,
      },
    };
  }

  private async seedRoles(): Promise<void> {
    for (const row of SEED_ROLES) {
      const current = await this.roles.findOne({ where: { code: row.code } });
      if (!current) {
        await this.roles.save(this.roles.create({ code: row.code, name: row.name, isActive: true }));
      }
    }
  }

  private async seedAreas(): Promise<void> {
    for (const row of SEED_AREAS) {
      const current = await this.areas.findOne({ where: { code: row.code } });
      if (!current) {
        await this.areas.save(this.areas.create({ code: row.code, name: row.name, isActive: true }));
      }
    }
  }

  private async seedLeaders(): Promise<void> {
    for (const row of SEED_LEADERS) {
      const current = await this.leaders.findOne({ where: { code: row.code } });
      if (!current) {
        await this.leaders.save(
          this.leaders.create({
            code: row.code,
            fullName: row.fullName,
            areaCode: row.areaCode,
            email: row.email,
            isActive: true,
          }),
        );
      }
      // Seed leader_areas — área primaria
      const laExists = await this.leaderAreas.findOne({ where: { leaderCode: row.code, areaCode: row.areaCode } });
      if (!laExists) {
        await this.leaderAreas.save(
          this.leaderAreas.create({ leaderCode: row.code, areaCode: row.areaCode, isPrimary: true }),
        );
      }
      // Áreas adicionales del seed (si las hay)
      if (row.extraAreaCodes) {
        for (const extraArea of row.extraAreaCodes) {
          const exists = await this.leaderAreas.findOne({ where: { leaderCode: row.code, areaCode: extraArea } });
          if (!exists) {
            await this.leaderAreas.save(
              this.leaderAreas.create({ leaderCode: row.code, areaCode: extraArea, isPrimary: false }),
            );
          }
        }
      }
    }
  }

  private async seedUsers(): Promise<void> {
    for (const row of SEED_DEMO_USERS) {
      let current = await this.users.findOne({ where: { email: row.email } });
      if (!current) {
        current = await this.users.save(
          this.users.create({
            email: row.email,
            fullName: row.fullName,
            roleCode: row.roleCode,
            areaCode: row.areaCode,
            leaderCode: row.leaderCode,
            passwordHash: hashPassword(process.env.DEMO_DEFAULT_PASSWORD || 'demo1234'),
            isActive: true,
          }),
        );
      } else if (!current.passwordHash) {
        current.passwordHash = hashPassword(process.env.DEMO_DEFAULT_PASSWORD || 'demo1234');
        await this.users.save(current);
      }
      // Seed user_areas — área primaria
      const uaExists = await this.userAreas.findOne({ where: { userId: current.id, areaCode: row.areaCode } });
      if (!uaExists) {
        await this.userAreas.save(
          this.userAreas.create({
            userId: current.id,
            areaCode: row.areaCode,
            leaderCode: row.leaderCode,
            isPrimary: true,
          }),
        );
      }
      // Áreas adicionales del seed (si las hay)
      if (row.extraAreas) {
        for (const extra of row.extraAreas) {
          const exists = await this.userAreas.findOne({ where: { userId: current.id, areaCode: extra.areaCode } });
          if (!exists) {
            await this.userAreas.save(
              this.userAreas.create({
                userId: current.id,
                areaCode: extra.areaCode,
                leaderCode: extra.leaderCode,
                isPrimary: false,
              }),
            );
          }
        }
      }
    }
  }

  private async seedWorkSites(): Promise<void> {
    const rows = [
      { code: 'PLANTA', name: 'PLANTA', sortOrder: 10 },
      { code: 'FUNDO_TARATA', name: 'FUNDO TARATA', sortOrder: 20 },
      { code: 'FUNDO_MASARIS', name: 'FUNDO MASARIS', sortOrder: 30 },
      { code: 'FUNDO_CARMELO', name: 'FUNDO CARMELO', sortOrder: 40 },
      { code: 'FUNDO_LA_VINA', name: 'FUNDO LA VIÑA', sortOrder: 50 },
      { code: 'FUNDO_SANTA_LUCIA', name: 'FUNDO SANTA LUCÍA', sortOrder: 60 },
    ];
    for (const row of rows) {
      const current = await this.workSites.findOne({ where: { code: row.code } });
      if (!current) {
        await this.workSites.save(this.workSites.create({ ...row, isActive: true }));
      }
    }
  }

  /** Evita colisión de correlativos INS-* tras semilla con códigos fijos. */
  private async syncInspectionSerialFromExisting(): Promise<void> {
    const raw = await this.inspections
      .createQueryBuilder('i')
      .select('i.inspectionCode', 'code')
      .where("i.inspectionCode ILIKE 'INS-%'")
      .getRawMany<{ code: string }>();
    const maxByYear = new Map<number, number>();
    for (const row of raw) {
      const m = String(row.code).match(/^INS-(\d{4})-(\d+)$/i);
      if (!m) continue;
      const y = Number(m[1]);
      const n = Number(m[2]);
      maxByYear.set(y, Math.max(maxByYear.get(y) ?? 0, n));
    }
    for (const [year, last] of maxByYear) {
      await this.inspections.manager.query(
        `INSERT INTO inspection_serial (year, last_value) VALUES ($1, $2)
         ON CONFLICT (year) DO UPDATE SET last_value = GREATEST(inspection_serial.last_value, $2)`,
        [year, last],
      );
    }
  }

  private async seedCatalogs(): Promise<void> {
    const rows = [
      { catalogType: 'inspection_type', code: 'act', label: 'Acto inseguro' },
      { catalogType: 'inspection_type', code: 'condition', label: 'Condicion insegura' },
      { catalogType: 'risk_level', code: 'low', label: 'Bajo' },
      { catalogType: 'risk_level', code: 'medium', label: 'Medio' },
      { catalogType: 'risk_level', code: 'high', label: 'Alto' },
      { catalogType: 'inspection_status', code: 'open', label: 'Abierta' },
      { catalogType: 'inspection_status', code: 'in_progress', label: 'En proceso' },
      { catalogType: 'inspection_status', code: 'closed', label: 'Cerrada' },
      { catalogType: 'report_source', code: 'whatsapp', label: 'WhatsApp' },
      { catalogType: 'report_source', code: 'checklist', label: 'Check list' },
      { catalogType: 'report_source', code: 'verbal', label: 'Verbal' },
      { catalogType: 'report_source', code: 'correo', label: 'Correo electrónico' },
      { catalogType: 'report_source', code: 'sistema', label: 'Sistema' },
      { catalogType: 'employer_type', code: 'proserla', label: 'Proserla' },
      { catalogType: 'employer_type', code: 'tercero', label: 'Tercero / contratista' },
      { catalogType: 'employer_type', code: 'directo', label: 'Personal directo' },
      { catalogType: 'employer_type', code: 'visita', label: 'Visita' },
      { catalogType: 'employer_type', code: 'practicante', label: 'Practicante' },
    ];

    for (const row of rows) {
      const current = await this.catalogs.findOne({ where: { catalogType: row.catalogType, code: row.code } });
      if (!current) {
        await this.catalogs.save(this.catalogs.create({ ...row, isActive: true }));
      }
    }
  }

  private async seedInspections(): Promise<void> {
    for (const row of SEED_INSPECTIONS) {
      let inspection = await this.inspections.findOne({ where: { inspectionCode: row.inspectionCode } });
      if (!inspection) {
        inspection = await this.inspections.save(this.inspections.create(row));
      } else {
        await this.inspections.save(this.inspections.merge(inspection, row));
      }
      await this.seedEvidenceForInspection(inspection.inspectionCode, inspection.status);
    }
  }

  private async seedEvidenceForInspection(inspectionCode: string, status: InspectionStatus): Promise<void> {
    const reportExists = await this.inspectionImages.findOne({ where: { inspectionCode, imageType: InspectionImageType.REPORT } });
    if (!reportExists) {
      await this.inspectionImages.save(
        this.inspectionImages.create({
          inspectionCode,
          imageType: InspectionImageType.REPORT,
          url: `https://picsum.photos/seed/${inspectionCode}-report/600/400`,
          storagePath: `${inspectionCode}/report-demo.jpg`,
          uploadedBy: 'operador@demo.local',
        }),
      );
    }

    if (status === InspectionStatus.CLOSED) {
      const closureExists = await this.inspectionImages.findOne({
        where: { inspectionCode, imageType: InspectionImageType.CLOSURE },
      });
      if (!closureExists) {
        await this.inspectionImages.save(
          this.inspectionImages.create({
            inspectionCode,
            imageType: InspectionImageType.CLOSURE,
            url: `https://picsum.photos/seed/${inspectionCode}-closure/600/400`,
            storagePath: `${inspectionCode}/closure-demo.jpg`,
            uploadedBy: 'lider@demo.local',
          }),
        );
      }
    }
  }
}
