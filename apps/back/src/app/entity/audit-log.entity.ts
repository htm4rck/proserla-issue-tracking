import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Tipo de entidad: incident | user | area | leader | role | catalog_item */
  @Column({ length: 60 })
  entityType!: string;

  /** Identificador de negocio del objeto (incidentCode, userId, etc.) */
  @Column({ length: 120 })
  entityId!: string;

  /** Acción: create | update | delete */
  @Column({ length: 30 })
  action!: string;

  /** Campo principal que cambió (ej: "status") — para mostrar en lista */
  @Column({ length: 120, nullable: true })
  changeLabel?: string;

  /** Valor anterior del campo principal (ej: "open") */
  @Column({ length: 250, nullable: true })
  previousValue?: string;

  /** Valor nuevo del campo principal (ej: "in_progress") */
  @Column({ length: 250, nullable: true })
  nextValue?: string;

  /** Usuario que realizó el cambio */
  @Column({ length: 160, nullable: true })
  changedBy?: string;

  /** Snapshot completo del objeto ANTES del cambio */
  @Column({ type: 'jsonb', nullable: true })
  previousSnapshot?: Record<string, unknown>;

  /** Solo los campos que cambiaron { campo: { from, to } } */
  @Column({ type: 'jsonb', nullable: true })
  diff?: Record<string, { from: unknown; to: unknown }>;

  @CreateDateColumn()
  createdAt!: Date;
}
