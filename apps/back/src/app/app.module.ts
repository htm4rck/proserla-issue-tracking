import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { AreaModule } from './module/area.module';
import { AuditLogModule } from './module/audit-log.module';
import { AuthModule } from './module/auth.module';
import { CatalogItemModule } from './module/catalog-item.module';
import { HealthModule } from './module/health.module';
import { IncidentImageModule } from './module/incident-image.module';
import { IncidentModule } from './module/incident.module';
import { LeaderModule } from './module/leader.module';
import { ReportsModule } from './module/reports.module';
import { RoleModule } from './module/role.module';
import { SeedModule } from './module/seed.module';
import { UserModule } from './module/user.module';
import { WorkSiteModule } from './module/work-site.module';

const withDatabase = process.env.SKIP_DATABASE !== 'true';

function getTypeOrmConnectionOptions(config: ConfigService) {
  const databaseUrl = config.get<string>('DATABASE_URL');
  const sslEnv = config.get<string>('DATABASE_SSL', 'false') === 'true';

  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    const shouldUseSsl =
      sslEnv || config.get<string>('NODE_ENV', 'development') === 'production';

    return {
      type: 'postgres' as const,
      url: databaseUrl,
      autoLoadEntities: true,
      synchronize: config.get<string>('TYPEORM_SYNC', 'false') === 'true',
      logging: config.get<string>('DATABASE_LOGGING', 'false') === 'true',
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
      extra: {
        application_name: parsed.hostname,
      },
    };
  }

  return {
    type: 'postgres' as const,
    host: config.get<string>('DATABASE_HOST', 'localhost'),
    port: Number(config.get('DATABASE_PORT', 5432)),
    username: config.get<string>('DATABASE_USER', 'issue'),
    password: config.get<string>('DATABASE_PASSWORD', 'issue'),
    database: config.get<string>('DATABASE_NAME', 'issue_tracking'),
    autoLoadEntities: true,
    synchronize: config.get<string>('TYPEORM_SYNC', 'false') === 'true',
    logging: config.get<string>('DATABASE_LOGGING', 'false') === 'true',
    ssl: sslEnv ? { rejectUnauthorized: false } : false,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    CommonModule.register(),
    ...(withDatabase
      ? [
          TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) =>
              getTypeOrmConnectionOptions(config),
          }),
          IncidentModule,
          IncidentImageModule,
          UserModule,
          RoleModule,
          AreaModule,
          LeaderModule,
          CatalogItemModule,
          AuthModule,
          ReportsModule,
          SeedModule,
          AuditLogModule,
          WorkSiteModule,
        ]
      : []),
    HealthModule,
  ],
})
export class AppModule {}
