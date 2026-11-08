/**
 * Momap Maps – portable, storage-agnostic guide contract.
 * No partner data is loaded or exposed by this module.
 */
export const GUIDE_CATEGORIES = [
  "attraction", "restaurant", "accommodation", "nature", "museum",
  "culture", "event", "other",
] as const;
export type GuideCategory = (typeof GUIDE_CATEGORIES)[number];

export interface GuideBranding {
  title: string;
  accentColor: string;
  logoUrl?: string;
}
export interface GuideMapView {
  center: [number, number]; // [longitude, latitude], WGS84
  zoom: number;
}
export interface PublicGuideConfig {
  slug: string;
  organizationId: string; // internal reference; never include in public response
  branding: GuideBranding;
  map: GuideMapView;
  categories: GuideCategory[];
  poiIds: string[]; // explicit allowlist, never an implicit tenant-wide query
  eventIds: string[];
  published: boolean;
}
export type PublicGuideView = Omit<PublicGuideConfig, "organizationId" | "published">;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function uniqueIds(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length > 250 ||
    !value.every((id) => typeof id === "string" && UUID.test(id))) {
    throw new Error(name + " must contain at most 250 UUIDs.");
  }
  if (new Set(value).size !== value.length) throw new Error(name + " contains duplicates.");
  return value;
}
function validLogoUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      url.hostname.length > 0 && !url.hash;
  } catch { return false; }
}

/** Strict validation at the persistence/admin boundary; rejects unknown keys. */
export function validateGuideConfig(value: unknown): PublicGuideConfig {
  if (!isRecord(value) || !onlyKeys(value,
    ["slug", "organizationId", "branding", "map", "categories", "poiIds", "eventIds", "published"])) {
    throw new Error("Invalid guide configuration.");
  }
  const { slug, organizationId, branding, map, categories, poiIds, eventIds, published } = value;
  if (typeof slug !== "string" || slug.length > 80 || !SLUG.test(slug)) {
    throw new Error("Guide slug must be lowercase kebab-case (max 80 characters).");
  }
  if (typeof organizationId !== "string" || !UUID.test(organizationId)) {
    throw new Error("Invalid organization ID.");
  }
  if (!isRecord(branding) || !onlyKeys(branding, ["title", "accentColor", "logoUrl"]) ||
    typeof branding.title !== "string" || branding.title.trim().length < 2 ||
    branding.title.length > 100 || typeof branding.accentColor !== "string" ||
    !HEX_COLOR.test(branding.accentColor) ||
    (branding.logoUrl !== undefined && !validLogoUrl(branding.logoUrl))) {
    throw new Error("Invalid guide branding.");
  }
  if (!isRecord(map) || !onlyKeys(map, ["center", "zoom"]) ||
    !Array.isArray(map.center) || map.center.length !== 2 ||
    !map.center.every((n) => typeof n === "number" && Number.isFinite(n)) ||
    map.center[0] < -180 || map.center[0] > 180 ||
    map.center[1] < -90 || map.center[1] > 90 ||
    typeof map.zoom !== "number" || !Number.isFinite(map.zoom) ||
    map.zoom < 0 || map.zoom > 20) {
    throw new Error("Invalid map view.");
  }
  if (!Array.isArray(categories) || categories.length > GUIDE_CATEGORIES.length ||
    !categories.every((category) => GUIDE_CATEGORIES.includes(category as GuideCategory)) ||
    new Set(categories).size !== categories.length) {
    throw new Error("Invalid guide categories.");
  }
  if (typeof published !== "boolean") throw new Error("Invalid publication state.");
  const validatedPoiIds = uniqueIds(poiIds, "poiIds");
  const validatedEventIds = uniqueIds(eventIds, "eventIds");
  return {
    slug, organizationId,
    branding: {
      title: branding.title.trim(),
      accentColor: branding.accentColor.toLowerCase(),
      ...(branding.logoUrl === undefined ? {} : { logoUrl: branding.logoUrl as string }),
    },
    map: { center: [map.center[0], map.center[1]], zoom: map.zoom },
    categories: [...categories] as GuideCategory[],
    poiIds: [...validatedPoiIds],
    eventIds: [...validatedEventIds],
    published,
  };
}
function onlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

/**
 * Safe public projection; the owner identifier and publication flag are not returned.
 * Call only after authenticating the publisher and verifying published=true.
 */
export function toPublicGuideView(config: PublicGuideConfig): PublicGuideView {
  if (!config.published) throw new Error("Unpublished guides must not be exposed.");
  return {
    slug: config.slug,
    branding: { ...config.branding },
    map: { center: [...config.map.center] as [number, number], zoom: config.map.zoom },
    categories: [...config.categories],
    poiIds: [...config.poiIds],
    eventIds: [...config.eventIds],
  };
}
