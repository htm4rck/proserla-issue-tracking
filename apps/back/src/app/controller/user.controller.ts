import { Body, Controller, ForbiddenException, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import {
  CreateUserRequest,
  ResetUserPasswordRequest,
  ResetUserPasswordResponse,
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
    if (roleCode !== 'admin') {
      throw new ForbiddenException('Solo el administrador puede crear usuarios');
    }
    const user = await this.userService.create(payload);
    return new ApiResponse(true, 'Usuario creado correctamente', UserMapper.toResponse(user));
  }

  @Get()
  async findAll(): Promise<ApiResponse<UserResponse[]>> {
    const users = await this.userService.findAll();
    return new ApiResponse(
      true,
      'Listado de usuarios obtenido correctamente',
      users.map(UserMapper.toResponse),
    );
  }

  @Patch(':userId/reset-password')
  async resetPassword(
    @Param('userId') userId: string,
    @Body() payload: ResetUserPasswordRequest,
    @Headers('x-role-code') roleCode?: string,
  ): Promise<ApiResponse<ResetUserPasswordResponse>> {
    if (roleCode !== 'admin') {
      throw new ForbiddenException('Solo el administrador puede resetear contraseñas');
    }
    const user = await this.userService.resetPassword(userId, payload.newPassword);
    return new ApiResponse(true, 'Contraseña reseteada correctamente', {
      userId: user.id,
      email: user.email,
      updatedAt: user.updatedAt,
    });
  }
}
