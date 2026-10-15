import { ICONS } from '../../shared/icons/icons';
import type { MapPlace } from '../services/discovery.model';

/** Single palette/icon vocabulary for map buttons, legend, popups and selected cards. */
export const CATEGORY_VISUALS = {
  attraction: { key: 'attraction', label: 'Látnivaló', color: '#f4c66b', icon: ICONS.Landmark },
  restaurant: { key: 'restaurant', label: 'Étterem', color: '#ffad97', icon: ICONS.Utensils },
  accommodation: { key: 'accommodation', label: 'Szállás', color: '#c8b9ff', icon: ICONS.BedDouble },
  nature: { key: 'nature', label: 'Természet', color: '#86ddb0', icon: ICONS.Trees },
  event: { key: 'event', label: 'Esemény', color: '#91d4ff', icon: ICONS.CalendarDays },
  other: { key: 'other', label: 'Egyéb hely', color: '#cbd3dd', icon: ICONS.MapPin },
} as const;
export type CategoryVisual = (typeof CATEGORY_VISUALS)[keyof typeof CATEGORY_VISUALS];
export function categoryVisual(place: Pick<MapPlace, 'kind' | 'category'>): CategoryVisual {
  if (place.kind === 'event') return CATEGORY_VISUALS.event;
  return Object.prototype.hasOwnProperty.call(CATEGORY_VISUALS, place.category)
    ? CATEGORY_VISUALS[place.category as keyof typeof CATEGORY_VISUALS] : CATEGORY_VISUALS.other;
}
