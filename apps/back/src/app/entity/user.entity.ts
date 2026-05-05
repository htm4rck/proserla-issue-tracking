import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 180 })
  email!: string;

  @Column({ length: 150 })
  fullName!: string;

  @Column({ length: 40 })
  roleCode!: string;

  /**
   * Área primaria — se mantiene por compatibilidad con incidencias existentes
   * y como fallback en headers de sesión. Siempre debe coincidir con la entrada
   * isPrimary=true en user_areas.
   */
  @Column({ length: 60 })
  areaCode!: string;

  /**
   * Líder del área primaria — fallback para headers de sesión.
   */
  @Column({ length: 60, nullable: true })
  leaderCode?: string;

  @Column({ type: 'text', nullable: true })
  passwordHash?: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
