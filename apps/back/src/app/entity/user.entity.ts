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

  @Column({ length: 60 })
  areaCode!: string;

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
