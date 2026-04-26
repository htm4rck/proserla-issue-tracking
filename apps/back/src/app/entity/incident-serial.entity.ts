import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Contador anual para códigos correlativos de incidencias (INC-AAAA-NNNNN). */
@Entity('incident_serial')
export class IncidentSerialEntity {
  @PrimaryColumn({ type: 'int' })
  year!: number;

  @Column({ name: 'last_value', type: 'int', default: 0 })
  lastValue!: number;
}
