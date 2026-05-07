import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Contador anual para códigos correlativos de inspecciones (INS-AAAA-NNNNN). */
@Entity('inspection_serial')
export class InspectionSerialEntity {
  @PrimaryColumn({ type: 'int' })
  year!: number;

  @Column({ name: 'last_value', type: 'int', default: 0 })
  lastValue!: number;
}
