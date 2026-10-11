/**
 * Central place for footer destinations that depend on real, verified URLs/pages.
 * Nothing is rendered for an empty list, so no dead or invented links can appear.
 *
 * Social profiles: no Momap profiles are configured yet. Add { label, url } entries with the real
 * https:// profile URL; the footer then shows them (generic link icon: lucide-angular ships no
 * Instagram/Facebook/Youtube/Tiktok brand icons).
 */
export interface SiteLink {
  label: string;
  url: string;
}

export const SOCIAL_LINKS: SiteLink[] = [];

/**
 * Legal pages. `route` = internal Angular route, `url` = external page. Add Impresszum, Adatvédelem
 * and Kapcsolat here only once the destination exists.
 */
export interface LegalLink {
  label: string;
  route?: string;
  url?: string;
}

export const LEGAL_LINKS: LegalLink[] = [];
