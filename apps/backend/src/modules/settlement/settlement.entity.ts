import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { County } from '../county/county.entity';

@Entity('settlements')
@Index(['countyId'])
@Index(['name'])
export class Settlement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  nameEn!: string;

  @Column()
  countyId!: string;

  @Column({ nullable: true })
  kshCode!: string; // Hungarian Central Statistical Office code

  @Column({ nullable: true })
  kshName!: string;

  @Column({ nullable: true })
  population!: number;

  @Column({ type: 'numeric', nullable: true, precision: 10, scale: 8 })
  latitude!: number;

  @Column({ type: 'numeric', nullable: true, precision: 11, scale: 8 })
  longitude!: number;

  @Column({ nullable: true })
  settlementType!: string; // 'city', 'town', 'village', 'capital'

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
