import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { InspectionImageType } from '../enum/inspection-image-type.enum';

@Entity('inspection_images')
export class InspectionImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  inspectionCode!: string;

  @Column({ type: 'enum', enum: InspectionImageType })
  imageType!: InspectionImageType;

  @Column({ length: 500 })
  url!: string;

  @Column({ length: 250, nullable: true })
  storagePath?: string;

  @Column({ length: 150, nullable: true })
  uploadedBy?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
