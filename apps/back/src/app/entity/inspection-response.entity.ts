import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { InspectionStatus } from '../enum/inspection-status.enum';

/**
 * Reemplaza inspection_images.
 * Cada respuesta está asociada a un estado de la inspección y puede tener comentario.
 * Una inspección puede tener múltiples respuestas por estado.
 */
@Entity('inspection_responses')
export class InspectionResponseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  inspectionCode!: string;

  /** Estado al que pertenece esta respuesta */
  @Column({ type: 'enum', enum: InspectionStatus })
  status!: InspectionStatus;

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
