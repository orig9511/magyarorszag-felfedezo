import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { PublicGuideConfig, PublicGuideView, toPublicGuideView, validateGuideConfig } from "./guide-config";

type GuideRow = {
  id: string; organization_id: string; slug: string; title: string;
  accent_color: string; logo_url: string | null; center_lng: number;
  center_lat: number; zoom: number; categories: unknown; published: boolean;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class GuidesService {
  constructor(private readonly db: DataSource) {}

  private assertSlug(slug: string): void {
    if (slug.length > 80 || !SLUG.test(slug)) throw new BadRequestException("Invalid guide slug");
  }
  private assertId(id: string): void {
    if (!UUID.test(id)) throw new BadRequestException("Invalid UUID");
  }

  private async loadConfig(id: string): Promise<PublicGuideConfig | null> {
    const rows: GuideRow[] = await this.db.query(
      `SELECT id, organization_id, slug, title, accent_color, logo_url, center_lng,
         center_lat, zoom, categories, published FROM momap_guides WHERE id = $1`, [id]);
    const row = rows[0];
    if (!row) return null;
    const [pois, events]: [{poi_id: string}[], {event_id: string}[]] = await Promise.all([
      this.db.query("SELECT poi_id FROM momap_guide_pois WHERE guide_id = $1 ORDER BY sort_order, poi_id", [id]),
      this.db.query("SELECT event_id FROM momap_guide_events WHERE guide_id = $1 ORDER BY sort_order, event_id", [id]),
    ]);
    return validateGuideConfig({
      slug: row.slug, organizationId: row.organization_id,
      branding: { title: row.title, accentColor: row.accent_color, ...(row.logo_url ? {logoUrl: row.logo_url} : {}) },
      map: {center: [Number(row.center_lng), Number(row.center_lat)], zoom: Number(row.zoom)},
      categories: row.categories, poiIds: pois.map(p => p.poi_id), eventIds: events.map(e => e.event_id),
      published: row.published,
    });
  }

  async publicGuide(slug: string): Promise<PublicGuideView> {
    this.assertSlug(slug);
    const rows: {id: string}[] = await this.db.query(
      "SELECT id FROM momap_guides WHERE slug = $1 AND published = true", [slug]);
    if (!rows[0]) throw new NotFoundException("Guide not found");
    const config = await this.loadConfig(rows[0].id);
    if (!config || !config.published) throw new NotFoundException("Guide not found");
    return toPublicGuideView(config);
  }

  /** Operator-only until real partner identities and organization RBAC are implemented. */
  async operatorGet(id: string): Promise<PublicGuideConfig> {
    this.assertId(id);
    const config = await this.loadConfig(id);
    if (!config) throw new NotFoundException("Guide not found");
    return config;
  }

  async operatorCreate(input: unknown): Promise<{id: string}> {
    let config: PublicGuideConfig;
    try { config = validateGuideConfig(input); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Invalid guide"); }
    // Fail closed: do not allow publishing before source/license review and membership authorization.
    if (config.published) throw new BadRequestException("Create as draft; publish through reviewed workflow");
    try {
      return await this.db.transaction(async manager => {
        const org: {id: string}[] = await manager.query(
          "SELECT id FROM momap_organizations WHERE id = $1 FOR SHARE", [config.organizationId]);
        if (!org[0]) throw new BadRequestException("Unknown organization");
        const created: {id: string}[] = await manager.query(
          `INSERT INTO momap_guides
            (organization_id, slug, title, accent_color, logo_url, center_lng, center_lat, zoom, categories, published)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,false) RETURNING id`,
          [config.organizationId,config.slug,config.branding.title,config.branding.accentColor,
            config.branding.logoUrl ?? null,config.map.center[0],config.map.center[1],config.map.zoom,
            JSON.stringify(config.categories)]);
        const id = created[0].id;
        for (const [table,ids,column] of [
          ["momap_guide_pois",config.poiIds,"poi_id"],["momap_guide_events",config.eventIds,"event_id"],
        ] as const) {
          for (const [index,refId] of ids.entries()) {
            await manager.query(`INSERT INTO ${table} (guide_id, ${column}, sort_order) VALUES ($1,$2,$3)`,[id,refId,index]);
          }
        }
        return {id};
      });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") {
        throw new ConflictException("Guide slug already exists");
      }
      throw error;
    }
  }

  async operatorReplace(id: string, input: unknown): Promise<{id: string}> {
    this.assertId(id);
    let config: PublicGuideConfig;
    try { config = validateGuideConfig(input); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "Invalid guide"); }
    if (config.published) throw new BadRequestException("Publishing is disabled until license review");
    try {
      return await this.db.transaction(async manager => {
        const old: {organization_id: string, published: boolean}[] = await manager.query(
          "SELECT organization_id, published FROM momap_guides WHERE id = $1 FOR UPDATE", [id]);
        if (!old[0]) throw new NotFoundException("Guide not found");
        if (old[0].organization_id !== config.organizationId) throw new BadRequestException("Cannot transfer guide ownership");
        if (old[0].published) throw new BadRequestException("Unpublish through reviewed workflow first");
        await manager.query(
          `UPDATE momap_guides SET slug=$2,title=$3,accent_color=$4,logo_url=$5,
          center_lng=$6,center_lat=$7,zoom=$8,categories=$9::jsonb,updated_at=now()
          WHERE id=$1`,
          [id,config.slug,config.branding.title,config.branding.accentColor,
            config.branding.logoUrl ?? null,config.map.center[0],config.map.center[1],config.map.zoom,
            JSON.stringify(config.categories)]);
        await manager.query("DELETE FROM momap_guide_pois WHERE guide_id=$1",[id]);
        await manager.query("DELETE FROM momap_guide_events WHERE guide_id=$1",[id]);
        for (const [table,ids,column] of [
          ["momap_guide_pois",config.poiIds,"poi_id"],["momap_guide_events",config.eventIds,"event_id"],
        ] as const) {
          for (const [index,refId] of ids.entries()) {
            await manager.query(`INSERT INTO ${table} (guide_id, ${column}, sort_order) VALUES ($1,$2,$3)`,[id,refId,index]);
          }
        }
        return {id};
      });
    } catch(error) {
      if (typeof error === "object" && error && "code" in error && error.code === "23505") {
        throw new ConflictException("Guide slug already exists");
      }
      throw error;
    }
  }
}
