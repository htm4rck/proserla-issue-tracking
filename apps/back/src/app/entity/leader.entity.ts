import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('leaders')
export class LeaderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 60 })
  code!: string;

  @Column({ length: 150 })
  fullName!: string;

  @Column({ length: 180, nullable: true })
  email?: string;

  /**
   * Área primaria — se mantiene por compatibilidad con incidencias existentes.
   * Siempre debe coincidir con la entrada isPrimary=true en leader_areas.
   */
  @Column({ length: 60 })
  areaCode!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
