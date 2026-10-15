import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import { Point } from "typeorm";

@Entity("events")
@Index(["location"], { spatial: true })
@Index(["startTime", "endTime"])
@Index(["countyId"])
@Index(["source", "sourceId"], { unique: true })
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  description!: string;

  @Column()
  category!: string; // 'concert', 'festival', 'exhibition', 'cultural', 'sports', etc.

  @Column({ nullable: true })
  eventType!: string;

  @Column({ default: "Europe/Budapest" })
  timezone!: string;

  @Column("timestamp")
  startTime!: Date;

  @Column("timestamp", { nullable: true })
  endTime!: Date;

  @Column({ nullable: true })
  venue!: string;

  @Column("geometry", {
    spatialFeatureType: "Point",
    srid: 4326,
    nullable: true,
  })
  location!: Point | null;

  @Column()
  countyId!: string;

  @Column()
  settlement!: string; // Town/city name

  @Column({ nullable: true })
  performers!: string; // Comma-separated or JSON array stored as string

  @Column()
  source!: string; // 'osm', 'wikidata', 'organizer', 'editorial', etc.

  @Column()
  sourceId!: string; // External ID from the source

  @Column({ nullable: true })
  sourceUrl!: string; // Original URL from the source

  @Column({ nullable: true })
  officialEventUrl!: string;

  @Column({ nullable: true })
  ticketUrl!: string;

  @Column({ nullable: true })
  licenseType!: string; // 'cc0', 'cc-by', 'ogl', 'proprietary', etc.

  @Column({ nullable: true })
  attribution!: string; // Attribution text if required by license

  @Column({ default: "active" })
  status!: string; // 'active', 'cancelled', 'postponed', 'draft'

  @Column({ type: "timestamp", nullable: true })
  statusChangedAt!: Date;

  @Column({ default: false })
  sponsored!: boolean;

  @Column({ nullable: true })
  ownerId!: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  retrievedAt!: Date; // When this record was fetched from the source

  @Column({ type: "timestamp", nullable: true })
  lastCheckedAt!: Date;

  @Column({ default: false })
  isTestData!: boolean;
}
