import { Module, ConfigModule, TordoModule } from '@tordo/backend';
import { CommonModule } from './common/common.module';
import { RootController } from './controller/root.controller';
import { AreaModule } from './module/area.module';
import { AuditLogModule } from './module/audit-log.module';
import { AuthModule } from './module/auth.module';
import { CatalogItemModule } from './module/catalog-item.module';
import { HealthModule } from './module/health.module';
import { InspectionImageModule } from './module/inspection-image.module';
import { InspectionModule } from './module/inspection.module';
import { LeaderModule } from './module/leader.module';
import { ReportsModule } from './module/reports.module';
import { RoleModule } from './module/role.module';
import { SeedModule } from './module/seed.module';
import { UserModule } from './module/user.module';
import { WorkSiteModule } from './module/work-site.module';

const withDatabase = process.env.SKIP_DATABASE !== 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    TordoModule.forRoot({ provideDatabase: withDatabase }),
    CommonModule.register(),
    ...(withDatabase
      ? [
          InspectionModule,
          InspectionImageModule,
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
  controllers: [RootController],
})
export class AppModule {}
