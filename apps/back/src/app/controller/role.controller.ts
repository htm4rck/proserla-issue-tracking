import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import { CreateRoleRequest, RoleMapper, RoleResponse } from '../mapper/role.mapper';
import { RoleService } from '../service/role.service';

@ApiTags('roles')
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  async create(@Body() payload: CreateRoleRequest): Promise<ApiResponse<RoleResponse>> {
    const role = await this.roleService.create(payload);
    return new ApiResponse(true, 'Rol creado correctamente', RoleMapper.toResponse(role));
  }

  @Get()
  async findAll(): Promise<ApiResponse<RoleResponse[]>> {
    const roles = await this.roleService.findAll();
    return new ApiResponse(true, 'Listado de roles obtenido correctamente', roles.map(RoleMapper.toResponse));
  }
}
