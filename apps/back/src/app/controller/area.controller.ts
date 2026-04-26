import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import { AreaMapper, AreaResponse, CreateAreaRequest } from '../mapper/area.mapper';
import { AreaService } from '../service/area.service';

@ApiTags('areas')
@Controller('areas')
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Post()
  async create(@Body() payload: CreateAreaRequest): Promise<ApiResponse<AreaResponse>> {
    const area = await this.areaService.create(payload);
    return new ApiResponse(true, 'Área creada correctamente', AreaMapper.toResponse(area));
  }

  @Get()
  async findAll(): Promise<ApiResponse<AreaResponse[]>> {
    const areas = await this.areaService.findAll();
    return new ApiResponse(true, 'Listado de áreas obtenido correctamente', areas.map(AreaMapper.toResponse));
  }
}
