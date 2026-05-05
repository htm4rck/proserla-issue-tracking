import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Relación muchos-a-muchos entre líderes y áreas.
 * Un líder puede ser responsable de varias áreas.
 * El campo `isPrimary` marca el área principal del líder.
 */
@Entity('leader_areas')
export class LeaderAreaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 60 })
  leaderCode!: string;

  @Column({ length: 60 })
  areaCode!: string;

  /** Área principal del líder */
  @Column({ default: false })
  isPrimary!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
