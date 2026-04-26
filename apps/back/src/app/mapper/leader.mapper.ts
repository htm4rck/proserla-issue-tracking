import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LeaderEntity } from '../entity/leader.entity';

export class CreateLeaderRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  areaCode!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LeaderResponse {
  id!: string;
  code!: string;
  fullName!: string;
  email?: string;
  areaCode!: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class LeaderMapper {
  static toResponse(entity: LeaderEntity): LeaderResponse {
    return {
      id: entity.id,
      code: entity.code,
      fullName: entity.fullName,
      email: entity.email,
      areaCode: entity.areaCode,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
