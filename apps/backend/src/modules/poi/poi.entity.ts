import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { Point } from 'typeorm';

@Entity('pois')
@Index(['location'], { spatial: true })
export class POI {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column()
  category!: string; // 'attraction', 'restaurant', 'accommodation', 'event', etc.

  @Column('geometry', { spatialFeatureType: 'Point', srid: 4326 })
  location!: Point;

  @Column()
  countyId!: string;

  @Column({ nullable: true })
  address!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ nullable: true })
  website!: string;

  @Column({ nullable: true })
  imageUrl!: string;

  @Column()
  source!: string; // 'osm', 'wikidata', 'lechner', 'imported', etc.

  @Column()
  sourceId!: string; // External ID from the source

  @Column({ default: false })
  sponsored!: boolean;

  @Column({ nullable: true })
  ownerId!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}
