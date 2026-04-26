import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaEntity } from '../entity/area.entity';
import { CatalogItemEntity } from '../entity/catalog-item.entity';
import { IncidentImageEntity } from '../entity/incident-image.entity';
import { IncidentEntity } from '../entity/incident.entity';
import { LeaderEntity } from '../entity/leader.entity';
import { RoleEntity } from '../entity/role.entity';
import { UserEntity } from '../entity/user.entity';
import { IncidentImageType } from '../enum/incident-image-type.enum';
import { IncidentStatus } from '../enum/incident-status.enum';
import {
  SEED_AREAS,
  SEED_DEMO_USERS,
  SEED_INCIDENTS,
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
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(CatalogItemEntity) private readonly catalogs: Repository<CatalogItemEntity>,
    @InjectRepository(IncidentEntity) private readonly incidents: Repository<IncidentEntity>,
    @InjectRepository(IncidentImageEntity) private readonly images: Repository<IncidentImageEntity>,
  ) {}

  async run(): Promise<SeedRunPayload> {
    await this.seedRoles();
    await this.seedAreas();
    await this.seedLeaders();
    await this.seedUsers();
    await this.seedCatalogs();
    await this.seedIncidents();
    this.logger.log('Semilla de datos completada');

    return this.buildPayload();
  }

  async runIfEnabled(): Promise<void> {
    if (process.env.SEED_ON_BOOT !== 'true') return;
    await this.run();
  }

  private async buildPayload(): Promise<SeedRunPayload> {
    const [roles, areas, lideres, usuarios, catalogos, incidencias] = await Promise.all([
      this.roles.count(),
      this.areas.count(),
      this.leaders.count(),
      this.users.count(),
      this.catalogs.count(),
      this.incidents.count(),
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
      incidenciasDemo: SEED_INCIDENTS.slice(0, 8).map(
        (i) => `${i.incidentCode} (${i.status}, ${i.areaCode}, ${i.reportMonth})`,
      ),
      conteos: {
        roles,
        areas,
        lideres,
        usuarios,
        catalogos,
        incidencias,
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
    }
  }

  private async seedUsers(): Promise<void> {
    for (const row of SEED_DEMO_USERS) {
      const current = await this.users.findOne({ where: { email: row.email } });
      if (!current) {
        await this.users.save(
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
    }
  }

  private async seedCatalogs(): Promise<void> {
    const rows = [
      { catalogType: 'incident_type', code: 'act', label: 'Acto inseguro' },
      { catalogType: 'incident_type', code: 'condition', label: 'Condicion insegura' },
      { catalogType: 'risk_level', code: 'low', label: 'Bajo' },
      { catalogType: 'risk_level', code: 'medium', label: 'Medio' },
      { catalogType: 'risk_level', code: 'high', label: 'Alto' },
      { catalogType: 'incident_status', code: 'open', label: 'Abierta' },
      { catalogType: 'incident_status', code: 'in_progress', label: 'En proceso' },
      { catalogType: 'incident_status', code: 'closed', label: 'Cerrada' },
      { catalogType: 'report_source', code: 'whatsapp', label: 'WhatsApp' },
      { catalogType: 'report_source', code: 'checklist', label: 'Check list' },
      { catalogType: 'employer_type', code: 'proserla', label: 'Proserla' },
      { catalogType: 'employer_type', code: 'tercero', label: 'Tercero' },
    ];

    for (const row of rows) {
      const current = await this.catalogs.findOne({ where: { catalogType: row.catalogType, code: row.code } });
      if (!current) {
        await this.catalogs.save(this.catalogs.create({ ...row, isActive: true }));
      }
    }
  }

  private async seedIncidents(): Promise<void> {
    for (const row of SEED_INCIDENTS) {
      let incident = await this.incidents.findOne({ where: { incidentCode: row.incidentCode } });
      if (!incident) {
        incident = await this.incidents.save(this.incidents.create(row));
      } else {
        await this.incidents.save(this.incidents.merge(incident, row));
      }
      await this.seedEvidenceForIncident(incident.incidentCode, incident.status);
    }
  }

  private async seedEvidenceForIncident(incidentCode: string, status: IncidentStatus): Promise<void> {
    const reportExists = await this.images.findOne({ where: { incidentCode, imageType: IncidentImageType.REPORT } });
    if (!reportExists) {
      await this.images.save(
        this.images.create({
          incidentCode,
          imageType: IncidentImageType.REPORT,
          url: `https://picsum.photos/seed/${incidentCode}-report/600/400`,
          storagePath: `${incidentCode}/report-demo.jpg`,
          uploadedBy: 'operador@demo.local',
        }),
      );
    }

    if (status === IncidentStatus.CLOSED) {
      const closureExists = await this.images.findOne({
        where: { incidentCode, imageType: IncidentImageType.CLOSURE },
      });
      if (!closureExists) {
        await this.images.save(
          this.images.create({
            incidentCode,
            imageType: IncidentImageType.CLOSURE,
            url: `https://picsum.photos/seed/${incidentCode}-closure/600/400`,
            storagePath: `${incidentCode}/closure-demo.jpg`,
            uploadedBy: 'lider@demo.local',
          }),
        );
      }
    }
  }
}
