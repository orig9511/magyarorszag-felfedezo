/** Ad inventory is intentionally disabled until publisher approval and consent integration. */
export type LandingAdPlacement = 'after-categories' | 'after-featured' | 'before-footer';
export interface AdsConfig {
  enabled: boolean;
  publisherId: string;
  slots: Partial<Record<LandingAdPlacement, string>>;
}
/** Do not add real IDs until AdSense approval, privacy notices and consent handling are ready. */
export const ADS_CONFIG: AdsConfig = {
  enabled: false,
  publisherId: '',
  slots: {},
};
export function isAdSlotConfigured(placement: LandingAdPlacement): boolean {
  return ADS_CONFIG.enabled &&
    /^ca-pub-\d{16}$/.test(ADS_CONFIG.publisherId) &&
    /^\d{10,}$/.test(ADS_CONFIG.slots[placement] || '');
}
