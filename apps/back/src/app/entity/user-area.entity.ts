import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Relación muchos-a-muchos entre usuarios y áreas.
 * Un usuario puede pertenecer a varias áreas, cada una con un líder distinto.
 * El campo `isPrimary` marca el área principal (usada como fallback en filtros y headers de sesión).
 */
@Entity('user_areas')
export class UserAreaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 180 })
  userId!: string;

  @Column({ length: 60 })
  areaCode!: string;

  @Column({ length: 60, nullable: true })
  leaderCode?: string;

  /** Área principal del usuario — solo una por usuario debe tener isPrimary = true */
  @Column({ default: false })
  isPrimary!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
