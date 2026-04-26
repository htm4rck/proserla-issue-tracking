import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginRequest {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  userCode?: string;

  @IsString()
  @MinLength(4)
  password!: string;
}

export class LoginResponse {
  token!: string;
  userId!: string;
  email!: string;
  fullName!: string;
  roleCode!: string;
  areaCode!: string;
  leaderCode?: string;
}

export class ChangePasswordRequest {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @MinLength(4)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ChangePasswordResponse {
  userId!: string;
  updatedAt!: Date;
}

export class AuthMapper {}
