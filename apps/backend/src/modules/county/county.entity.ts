import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('counties')
@Index(['source', 'sourceId'], { unique: true })
export class County {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  nameEn!: string;

  @Index({ unique: true })
  @Column()
  code!: string; // ISO 3166-2 code, e.g. 'HU-HB'

  @Index({ spatial: true })
  @Column('geometry', { spatialFeatureType: 'MultiPolygon', srid: 4326 })
  geometry!: any; // GeoJSON-like geometry from PostGIS

  // Simplified copy of `geometry` for overview rendering only (see scripts/import-counties.mjs).
  // Never use it for spatial analysis or detailed views; `geometry` stays the source of truth.
  @Column('geometry', { spatialFeatureType: 'MultiPolygon', srid: 4326, nullable: true })
  displayGeometry!: any;

  @Column({ default: true })
  active!: boolean;

  // Provenance of the boundary (filled by scripts/import-counties.mjs).
  @Column({ type: 'varchar', nullable: true })
  source!: string | null; // e.g. 'lechner-inspire-au'

  @Column({ type: 'varchar', nullable: true })
  sourceId!: string | null; // stable identifier within the source

  @Column({ type: 'varchar', nullable: true })
  license!: string | null; // e.g. 'CC-BY-4.0'

  @Column({ type: 'text', nullable: true })
  attribution!: string | null; // credit text that must be shown with this data

  @Column({ type: 'timestamp', nullable: true })
  sourceUpdatedAt!: Date | null; // lifespan start / publication date in the source

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
