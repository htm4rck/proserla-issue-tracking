import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserEntity } from '../entity/user.entity';

export class CreateUserRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  roleCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  areaCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  leaderCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UserResponse {
  id!: string;
  email!: string;
  fullName!: string;
  roleCode!: string;
  areaCode!: string;
  leaderCode?: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ResetUserPasswordRequest {
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  newPassword!: string;
}

export class ResetUserPasswordResponse {
  userId!: string;
  email!: string;
  updatedAt!: Date;
}

export class UserMapper {
  static toResponse(entity: UserEntity): UserResponse {
    return {
      id: entity.id,
      email: entity.email,
      fullName: entity.fullName,
      roleCode: entity.roleCode,
      areaCode: entity.areaCode,
      leaderCode: entity.leaderCode,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
