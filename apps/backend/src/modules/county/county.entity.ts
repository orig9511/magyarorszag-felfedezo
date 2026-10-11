import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("counties")
export class County {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column()
  nameEn!: string;

  @Column()
  code!: string; // ISO 3166-2 code or HU-code

  @Column("geometry", { spatialFeatureType: "MultiPolygon", srid: 4326 })
  geometry!: any; // GeoJSON-like geometry from PostGIS

  @Column({ default: true })
  active!: boolean;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;
}
