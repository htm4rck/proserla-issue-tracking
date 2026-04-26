import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IncidentStatus } from '../enum/incident-status.enum';

/**
 * Reemplaza incident_images.
 * Cada respuesta está asociada a un estado de la incidencia y puede tener comentario.
 * Una incidencia puede tener múltiples respuestas por estado.
 */
@Entity('incident_responses')
export class IncidentResponseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  incidentCode!: string;

  /** Estado al que pertenece esta respuesta */
  @Column({ type: 'enum', enum: IncidentStatus })
  status!: IncidentStatus;

  /** report = apertura, closure = cierre */
  @Column({ length: 30 })
  imageType!: string;

  @Column({ length: 500 })
  url!: string;

  @Column({ length: 250, nullable: true })
  storagePath?: string;

  @Column({ length: 150, nullable: true })
  uploadedBy?: string;

  /** Comentario/observación asociado a esta imagen/respuesta */
  @Column({ type: 'text', nullable: true })
  comment?: string;

  /** Indica si el upload al PHP bridge fue exitoso */
  @Column({ default: true })
  uploadOk!: boolean;

  /** Mensaje de error del PHP bridge si uploadOk = false */
  @Column({ type: 'text', nullable: true })
  uploadError?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
