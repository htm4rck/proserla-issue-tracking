import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IncidentImageType } from '../enum/incident-image-type.enum';

@Entity('incident_images')
export class IncidentImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  incidentCode!: string;

  @Column({ type: 'enum', enum: IncidentImageType })
  imageType!: IncidentImageType;

  @Column({ length: 500 })
  url!: string;

  @Column({ length: 250, nullable: true })
  storagePath?: string;

  @Column({ length: 150, nullable: true })
  uploadedBy?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
