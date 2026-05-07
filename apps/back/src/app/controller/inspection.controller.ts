import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateInspectionRequest,
  InspectionMapper,
  PaginatedInspectionsResponse,
  InspectionResponse,
  SearchInspectionsRequest,
  UpdateInspectionRequest,
} from '../mapper/inspection.mapper';
import { ApiResponse } from '../mapper/api.mapper';
import { InspectionService } from '../service/inspection.service';

@ApiTags('inspections')
@Controller('inspections')
export class InspectionController {
  constructor(private readonly inspectionService: InspectionService) {}

  @Post()
  async create(
    @Body() payload: CreateInspectionRequest,
    @Headers('x-user-email') userEmail?: string,
  ): Promise<ApiResponse<InspectionResponse>> {
    const inspection = await this.inspectionService.create(payload, userEmail, userEmail);
    return new ApiResponse(true, 'Inspección registrada correctamente', InspectionMapper.toResponse(inspection));
  }

  @Get()
  async findAll(
    @Query() query: SearchInspectionsRequest,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<ApiResponse<InspectionResponse[]>> {
    const scopedQuery = { ...query };
    if (roleCode === 'leader') {
      scopedQuery.areaCode = areaCodeHeader || query.areaCode;
      scopedQuery.leaderCode = leaderCodeHeader || query.leaderCode;
    }
    const inspections = await this.inspectionService.findAll(scopedQuery);
    return new ApiResponse(true, 'Listado de inspecciones obtenido correctamente', inspections.map(InspectionMapper.toResponse));
  }

  @Get('paged')
  async findPaged(
    @Query() query: SearchInspectionsRequest,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<ApiResponse<PaginatedInspectionsResponse>> {
    const scopedQuery = { ...query };
    if (roleCode === 'leader') {
      scopedQuery.areaCode = areaCodeHeader || query.areaCode;
      scopedQuery.leaderCode = leaderCodeHeader || query.leaderCode;
    }
    const page = await this.inspectionService.findPaged(scopedQuery);
    return new ApiResponse(true, 'Listado paginado de inspecciones obtenido correctamente', {
      ...page,
      items: page.items.map(InspectionMapper.toResponse),
    });
  }

  @Get(':inspectionCode')
  async findByInspectionCode(
    @Param('inspectionCode') inspectionCode: string,
  ): Promise<ApiResponse<InspectionResponse | null>> {
    const inspection = await this.inspectionService.findByInspectionCode(inspectionCode);
    return new ApiResponse(
      true,
      inspection ? 'Inspección obtenida correctamente' : 'Inspección no encontrada',
      inspection ? InspectionMapper.toResponse(inspection) : null,
    );
  }

  @Patch(':inspectionCode')
  async update(
    @Param('inspectionCode') inspectionCode: string,
    @Body() payload: UpdateInspectionRequest,
    @Headers('x-user-email') userEmail?: string,
  ): Promise<ApiResponse<InspectionResponse>> {
    const inspection = await this.inspectionService.update(inspectionCode, payload, userEmail);
    return new ApiResponse(true, 'Inspección actualizada correctamente', InspectionMapper.toResponse(inspection));
  }

  @Delete(':inspectionCode')
  async remove(
    @Param('inspectionCode') inspectionCode: string,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-user-email') userEmail?: string,
  ): Promise<ApiResponse<{ inspectionCode: string }>> {
    if (roleCode !== 'admin') {
      throw new ForbiddenException('Solo el administrador puede eliminar registros');
    }
    await this.inspectionService.remove(inspectionCode, userEmail);
    return new ApiResponse(true, 'Inspección eliminada correctamente', { inspectionCode });
  }
}
