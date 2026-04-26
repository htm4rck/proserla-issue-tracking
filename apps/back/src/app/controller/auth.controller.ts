import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../mapper/api.mapper';
import {
  ChangePasswordRequest,
  ChangePasswordResponse,
  LoginRequest,
  LoginResponse,
} from '../mapper/auth.mapper';
import { AuthService } from '../service/auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() payload: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const session = await this.authService.login(payload);
    return new ApiResponse(true, 'Sesión iniciada correctamente', session);
  }

  @Post('change-password')
  async changePassword(
    @Body() payload: ChangePasswordRequest,
  ): Promise<ApiResponse<ChangePasswordResponse>> {
    const data = await this.authService.changePassword(payload);
    return new ApiResponse(true, 'Contraseña actualizada correctamente', data);
  }
}
