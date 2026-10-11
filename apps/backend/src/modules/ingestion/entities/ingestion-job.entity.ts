import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

export enum IngestionJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL_FAILURE = 'partial_failure',
}

@Entity('ingestion_jobs')
@Index(['sourceAdapter', 'runStartedAt'])
@Index(['status'])
export class IngestionJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  sourceAdapter!: string; // 'osm_geofabrik', 'wikidata', 'organizer_feed', etc.

  @Column({ default: IngestionJobStatus.PENDING })
  status!: IngestionJobStatus;

  @Column({ type: 'timestamp', nullable: true })
  runStartedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  runCompletedAt!: Date;

  @Column({ nullable: true })
  itemsProcessed!: number;

  @Column({ nullable: true })
  itemsCreated!: number;

  @Column({ nullable: true })
  itemsUpdated!: number;

  @Column({ nullable: true })
  itemsSkipped!: number;

  @Column({ nullable: true })
  itemsFailed!: number;

  @Column({ nullable: true })
  errorSummary!: string; // JSON or text summary of errors

  @Column({ nullable: true })
  rawLogUrl!: string; // S3 or local path to detailed log

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
