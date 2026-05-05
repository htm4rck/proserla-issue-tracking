import { Body, Controller, Delete, Get, Headers, ForbiddenException, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import {
  AddLeaderAreaRequest,
  CreateLeaderRequest,
  LeaderAreaResponse,
  LeaderMapper,
  LeaderResponse,
  RemoveLeaderAreaRequest,
} from '../mapper/leader.mapper';
import { LeaderService } from '../service/leader.service';

@ApiTags('leaders')
@Controller('leaders')
export class LeaderController {
  constructor(private readonly leaderService: LeaderService) {}

  @Post()
  async create(
    @Body() payload: CreateLeaderRequest,
    @Headers('x-role-code') roleCode?: string,
  ): Promise<ApiResponse<LeaderResponse>> {
    if (roleCode && roleCode !== 'admin') throw new ForbiddenException('Solo el administrador puede crear líderes');
    const { leader, areas } = await this.leaderService.create(payload);
    return new ApiResponse(true, 'Líder creado correctamente', LeaderMapper.toResponse(leader, areas));
  }

  @Get()
  async findAll(): Promise<ApiResponse<LeaderResponse[]>> {
    const results = await this.leaderService.findAll();
    return new ApiResponse(
      true,
      'Listado de líderes obtenido correctamente',
      results.map(({ leader, areas }) => LeaderMapper.toResponse(leader, areas)),
    );
  }

  // ── Gestión de áreas ────────────────────────────────────────────────────────

  @Post(':leaderCode/areas')
  async addArea(
    @Param('leaderCode') leaderCode: string,
    @Body() payload: AddLeaderAreaRequest,
    @Headers('x-role-code') roleCode?: string,
  ): Promise<ApiResponse<LeaderAreaResponse[]>> {
    if (roleCode !== 'admin') throw new ForbiddenException('Solo el administrador puede modificar áreas');
    const areas = await this.leaderService.addArea(leaderCode, payload);
    return new ApiResponse(true, 'Área agregada al líder', areas.map((a) => ({
      id: a.id,
      areaCode: a.areaCode,
      isPrimary: a.isPrimary,
    })));
  }

  @Delete(':leaderCode/areas')
  async removeArea(
    @Param('leaderCode') leaderCode: string,
    @Body() payload: RemoveLeaderAreaRequest,
    @Headers('x-role-code') roleCode?: string,
  ): Promise<ApiResponse<LeaderAreaResponse[]>> {
    if (roleCode !== 'admin') throw new ForbiddenException('Solo el administrador puede modificar áreas');
    const areas = await this.leaderService.removeArea(leaderCode, payload);
    return new ApiResponse(true, 'Área eliminada del líder', areas.map((a) => ({
      id: a.id,
      areaCode: a.areaCode,
      isPrimary: a.isPrimary,
    })));
  }

  @Patch(':leaderCode/areas/:areaCode/primary')
  async setPrimaryArea(
    @Param('leaderCode') leaderCode: string,
    @Param('areaCode') areaCode: string,
    @Headers('x-role-code') roleCode?: string,
  ): Promise<ApiResponse<LeaderAreaResponse[]>> {
    if (roleCode !== 'admin') throw new ForbiddenException('Solo el administrador puede modificar áreas');
    // Reutilizamos addArea con isPrimary=true si ya existe, o simplemente actualizamos
    const areas = await this.leaderService.addArea(leaderCode, { areaCode, isPrimary: true }).catch(async () => {
      // Si ya existe, solo cambiamos la primaria
      const all = await this.leaderService.getAreasForLeader(leaderCode);
      for (const a of all) {
        a.isPrimary = a.areaCode === areaCode;
      }
      return this.leaderService.getAreasForLeader(leaderCode);
    });
    return new ApiResponse(true, 'Área primaria del líder actualizada', areas.map((a) => ({
      id: a.id,
      areaCode: a.areaCode,
      isPrimary: a.isPrimary,
    })));
  }
}
