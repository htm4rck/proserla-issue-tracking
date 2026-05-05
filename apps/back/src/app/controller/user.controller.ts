import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import {
  AddUserAreaRequest,
  CreateUserRequest,
  RemoveUserAreaRequest,
  ResetUserPasswordRequest,
  ResetUserPasswordResponse,
  UserAreaResponse,
  UserMapper,
  UserResponse,
} from '../mapper/user.mapper';
import { UserService } from '../service/user.service';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(
    @Body() payload: CreateUserRequest,
    @Headers('x-role-code') roleCode?: string,
  ): Promise<ApiResponse<UserResponse>> {
    if (roleCode !== 'admin') throw new ForbiddenException('Solo el administrador puede crear usuarios');
    const { user, areas } = await this.userService.create(payload);
    return new ApiResponse(true, 'Usuario creado correctamente', UserMapper.toResponse(user, areas));
  }

  @Get()
  async findAll(): Promise<ApiResponse<UserResponse[]>> {
    const results = await this.userService.findAll();
    return new ApiResponse(
      true,
      'Listado de usuarios obtenido correctamente',
      results.map(({ user, areas }) => UserMapper.toResponse(user, areas)),
    );
  }

  // ── Gestión de áreas ────────────────────────────────────────────────────────

  @Post(':userId/areas')
  async addArea(
    @Param('userId') userId: string,
    @Body() payload: AddUserAreaRequest,
    @Headers('x-role-code') roleCode?: string,
  ): Promise<ApiResponse<UserAreaResponse[]>> {
    if (roleCode !== 'admin') throw new ForbiddenException('Solo el administrador puede modificar áreas');
    const areas = await this.userService.addArea(userId, payload);
    return new ApiResponse(true, 'Área agregada correctamente', areas.map((a) => ({
      id: a.id,
      areaCode: a.areaCode,
      leaderCode: a.leaderCode,
      isPrimary: a.isPrimary,
    })));
  }

  @Delete(':userId/areas')
  async removeArea(
    @Param('userId') userId: string,
    @Body() payload: RemoveUserAreaRequest,
    @Headers('x-role-code') roleCode?: string,
  ): Promise<ApiResponse<UserAreaResponse[]>> {
    if (roleCode !== 'admin') throw new ForbiddenException('Solo el administrador puede modificar áreas');
    const areas = await this.userService.removeArea(userId, payload);
    return new ApiResponse(true, 'Área eliminada correctamente', areas.map((a) => ({
      id: a.id,
      areaCode: a.areaCode,
      leaderCode: a.leaderCode,
      isPrimary: a.isPrimary,
    })));
  }

  @Patch(':userId/areas/:areaCode/primary')
  async setPrimaryArea(
    @Param('userId') userId: string,
    @Param('areaCode') areaCode: string,
    @Headers('x-role-code') roleCode?: string,
  ): Promise<ApiResponse<UserAreaResponse[]>> {
    if (roleCode !== 'admin') throw new ForbiddenException('Solo el administrador puede modificar áreas');
    const areas = await this.userService.setPrimaryArea(userId, areaCode);
    return new ApiResponse(true, 'Área primaria actualizada', areas.map((a) => ({
      id: a.id,
      areaCode: a.areaCode,
      leaderCode: a.leaderCode,
      isPrimary: a.isPrimary,
    })));
  }

  // ── Contraseña ──────────────────────────────────────────────────────────────

  @Patch(':userId/reset-password')
  async resetPassword(
    @Param('userId') userId: string,
    @Body() payload: ResetUserPasswordRequest,
    @Headers('x-role-code') roleCode?: string,
  ): Promise<ApiResponse<ResetUserPasswordResponse>> {
    if (roleCode !== 'admin') throw new ForbiddenException('Solo el administrador puede resetear contraseñas');
    const user = await this.userService.resetPassword(userId, payload.newPassword);
    return new ApiResponse(true, 'Contraseña reseteada correctamente', {
      userId: user.id,
      email: user.email,
      updatedAt: user.updatedAt,
    });
  }
}
