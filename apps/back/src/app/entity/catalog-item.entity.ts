import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('catalog_items')
export class CatalogItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 60 })
  catalogType!: string;

  @Column({ length: 80 })
  code!: string;

  @Column({ length: 150 })
  label!: string;

  @Column({ length: 200, nullable: true })
  description?: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
