import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogItemController } from '../controller/catalog-item.controller';
import { CatalogItemEntity } from '../entity/catalog-item.entity';
import { CatalogItemService } from '../service/catalog-item.service';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogItemEntity])],
  controllers: [CatalogItemController],
  providers: [CatalogItemService],
  exports: [CatalogItemService],
})
export class CatalogItemModule {}
