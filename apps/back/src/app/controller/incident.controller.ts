import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateIncidentRequest,
  IncidentMapper,
  PaginatedIncidentsResponse,
  IncidentResponse,
  SearchIncidentsRequest,
  UpdateIncidentRequest,
} from '../mapper/incident.mapper';
import { ApiResponse } from '../mapper/api.mapper';
import { IncidentService } from '../service/incident.service';

@ApiTags('incidents')
@Controller('incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post()
  async create(
    @Body() payload: CreateIncidentRequest,
    @Headers('x-user-email') userEmail?: string,
  ): Promise<ApiResponse<IncidentResponse>> {
    const incident = await this.incidentService.create(payload, userEmail, userEmail);
    return new ApiResponse(true, 'Incidencia registrada correctamente', IncidentMapper.toResponse(incident));
  }

  @Get()
  async findAll(
    @Query() query: SearchIncidentsRequest,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<ApiResponse<IncidentResponse[]>> {
    const scopedQuery = { ...query };
    if (roleCode === 'leader') {
      scopedQuery.areaCode = areaCodeHeader || query.areaCode;
      scopedQuery.leaderCode = leaderCodeHeader || query.leaderCode;
    }
    const incidents = await this.incidentService.findAll(scopedQuery);
    return new ApiResponse(true, 'Listado de incidencias obtenido correctamente', incidents.map(IncidentMapper.toResponse));
  }

  @Get('paged')
  async findPaged(
    @Query() query: SearchIncidentsRequest,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-area-code') areaCodeHeader?: string,
    @Headers('x-leader-code') leaderCodeHeader?: string,
  ): Promise<ApiResponse<PaginatedIncidentsResponse>> {
    const scopedQuery = { ...query };
    if (roleCode === 'leader') {
      scopedQuery.areaCode = areaCodeHeader || query.areaCode;
      scopedQuery.leaderCode = leaderCodeHeader || query.leaderCode;
    }
    const page = await this.incidentService.findPaged(scopedQuery);
    return new ApiResponse(true, 'Listado paginado de incidencias obtenido correctamente', {
      ...page,
      items: page.items.map(IncidentMapper.toResponse),
    });
  }

  @Get(':incidentCode')
  async findByIncidentCode(
    @Param('incidentCode') incidentCode: string,
  ): Promise<ApiResponse<IncidentResponse | null>> {
    const incident = await this.incidentService.findByIncidentCode(incidentCode);
    return new ApiResponse(
      true,
      incident ? 'Incidencia obtenida correctamente' : 'Incidencia no encontrada',
      incident ? IncidentMapper.toResponse(incident) : null,
    );
  }

  @Patch(':incidentCode')
  async update(
    @Param('incidentCode') incidentCode: string,
    @Body() payload: UpdateIncidentRequest,
    @Headers('x-user-email') userEmail?: string,
  ): Promise<ApiResponse<IncidentResponse>> {
    const incident = await this.incidentService.update(incidentCode, payload, userEmail);
    return new ApiResponse(true, 'Incidencia actualizada correctamente', IncidentMapper.toResponse(incident));
  }

  @Delete(':incidentCode')
  async remove(
    @Param('incidentCode') incidentCode: string,
    @Headers('x-role-code') roleCode?: string,
    @Headers('x-user-email') userEmail?: string,
  ): Promise<ApiResponse<{ incidentCode: string }>> {
    if (roleCode !== 'admin') {
      throw new ForbiddenException('Solo el administrador puede eliminar registros');
    }
    await this.incidentService.remove(incidentCode, userEmail);
    return new ApiResponse(true, 'Incidencia eliminada correctamente', { incidentCode });
  }
}
