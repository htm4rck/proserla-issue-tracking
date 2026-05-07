import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedController } from '../controller/seed.controller';
import { AreaEntity } from '../entity/area.entity';
import { CatalogItemEntity } from '../entity/catalog-item.entity';
import { InspectionEntity } from '../entity/inspection.entity';
import { InspectionImageEntity } from '../entity/inspection-image.entity';
import { LeaderAreaEntity } from '../entity/leader-area.entity';
import { LeaderEntity } from '../entity/leader.entity';
import { RoleEntity } from '../entity/role.entity';
import { UserAreaEntity } from '../entity/user-area.entity';
import { UserEntity } from '../entity/user.entity';
import { WorkSiteEntity } from '../entity/work-site.entity';
import { SeedService } from '../service/seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoleEntity,
      AreaEntity,
      LeaderEntity,
      LeaderAreaEntity,
      UserEntity,
      UserAreaEntity,
      CatalogItemEntity,
      InspectionEntity,
      InspectionImageEntity,
      WorkSiteEntity,
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule implements OnApplicationBootstrap {
  constructor(private readonly seedService: SeedService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedService.runIfEnabled();
  }
}
