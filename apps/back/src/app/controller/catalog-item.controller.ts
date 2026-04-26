import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import {
  CatalogItemMapper,
  CatalogItemResponse,
  CreateCatalogItemRequest,
} from '../mapper/catalog-item.mapper';
import { CatalogItemService } from '../service/catalog-item.service';

@ApiTags('catalog-items')
@Controller('catalog-items')
export class CatalogItemController {
  constructor(private readonly catalogItemService: CatalogItemService) {}

  @Post()
  async create(
    @Body() payload: CreateCatalogItemRequest,
  ): Promise<ApiResponse<CatalogItemResponse>> {
    const item = await this.catalogItemService.create(payload);
    return new ApiResponse(
      true,
      'Elemento de catálogo creado correctamente',
      CatalogItemMapper.toResponse(item),
    );
  }

  @Get()
  async findAll(@Query('catalogType') catalogType?: string): Promise<ApiResponse<CatalogItemResponse[]>> {
    const items = await this.catalogItemService.findAll();
    const filtered = catalogType
      ? items.filter((item) => item.catalogType === catalogType)
      : items;
    return new ApiResponse(
      true,
      'Listado de catálogo obtenido correctamente',
      filtered.map(CatalogItemMapper.toResponse),
    );
  }
}
