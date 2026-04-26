import { Body, Controller, ForbiddenException, Get, Headers, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import { CreateWorkSiteRequest, WorkSiteMapper, WorkSiteResponse } from '../mapper/work-site.mapper';
import { WorkSiteService } from '../service/work-site.service';

@ApiTags('work-sites')
@Controller('work-sites')
export class WorkSiteController {
  constructor(private readonly workSiteService: WorkSiteService) {}

  @Get()
  async listActive(): Promise<ApiResponse<WorkSiteResponse[]>> {
    const rows = await this.workSiteService.findAllActive();
    return new ApiResponse(true, 'Listado de fundos/planta', rows.map(WorkSiteMapper.toResponse));
  }

  /** Listado completo (incluye inactivos) para mantenimiento en Maestros. */
  @Get('admin/all')
  async listAll(@Headers('x-role-code') roleCode?: string): Promise<ApiResponse<WorkSiteResponse[]>> {
    if ((roleCode ?? '').trim().toLowerCase() !== 'admin') {
      throw new ForbiddenException('Solo administradores pueden listar todos los fundos/planta.');
    }
    const rows = await this.workSiteService.findAll();
    return new ApiResponse(true, 'Listado completo de fundos/planta', rows.map(WorkSiteMapper.toResponse));
  }

  @Post()
  async create(
    @Body() payload: CreateWorkSiteRequest,
    @Headers('x-role-code') roleCode?: string,
  ): Promise<ApiResponse<WorkSiteResponse>> {
    if ((roleCode ?? '').trim().toLowerCase() !== 'admin') {
      throw new ForbiddenException('Solo administradores pueden crear fundos/planta.');
    }
    const row = await this.workSiteService.create(payload);
    return new ApiResponse(true, 'Registro creado correctamente', WorkSiteMapper.toResponse(row));
  }
}
