import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { InspectionStatus } from '../enum/inspection-status.enum';

@Entity('inspections')
export class InspectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 100 })
  inspectionCode!: string;

  @Column({ length: 160 })
  reportedBy!: string;

  /** Usuario que registró la inspección (no editable manualmente desde UI). */
  @Column({ type: 'uuid', nullable: true })
  reportedByUserId?: string;

  @Column({ type: 'int', nullable: true })
  reportYear?: number;

  @Column({ length: 20, nullable: true })
  reportMonth?: string;

  @Column({ type: 'int', nullable: true })
  reportDay?: number;

  @Column({ length: 20, nullable: true })
  reportTime?: string;

  @Column({ length: 120, nullable: true })
  site?: string;

  @Column({ length: 160, nullable: true })
  reportedPerson?: string;

  @Column({ length: 40, nullable: true })
  reportedPersonAge?: string;

  @Column({ length: 120, nullable: true })
  employerType?: string;

  @Column({ length: 60 })
  areaCode!: string;

  @Column({ length: 60, nullable: true })
  leaderCode?: string;

  @Column({ length: 150, nullable: true })
  assignedTo?: string;

  @Column({ length: 180 })
  location!: string;

  @Column({ length: 180, nullable: true })
  workArea?: string;

  @Column({ length: 30 })
  inspectionType!: string;

  @Column({ length: 30 })
  riskLevel!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ length: 80, nullable: true })
  reportSource?: string;

  @Column({ type: 'text', nullable: true })
  correctiveMeasures?: string;

  @Column({ type: 'enum', enum: InspectionStatus, default: InspectionStatus.OPEN })
  status!: InspectionStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
