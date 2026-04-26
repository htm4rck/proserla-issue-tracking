import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import { CreateLeaderRequest, LeaderMapper, LeaderResponse } from '../mapper/leader.mapper';
import { LeaderService } from '../service/leader.service';

@ApiTags('leaders')
@Controller('leaders')
export class LeaderController {
  constructor(private readonly leaderService: LeaderService) {}

  @Post()
  async create(@Body() payload: CreateLeaderRequest): Promise<ApiResponse<LeaderResponse>> {
    const leader = await this.leaderService.create(payload);
    return new ApiResponse(true, 'Líder creado correctamente', LeaderMapper.toResponse(leader));
  }

  @Get()
  async findAll(): Promise<ApiResponse<LeaderResponse[]>> {
    const leaders = await this.leaderService.findAll();
    return new ApiResponse(true, 'Listado de líderes obtenido correctamente', leaders.map(LeaderMapper.toResponse));
  }
}
