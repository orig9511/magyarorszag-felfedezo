import { normalizeOsmCategory, normalizeWikidataCategory } from './poi-taxonomy';
describe('Momap POI taxonomy',()=>{
 it.each([
  [{amenity:'restaurant'},'restaurant'],
  [{amenity:'fast_food'},'restaurant'],
  [{amenity:'cafe'},'cafe'],
  [{tourism:'hotel'},'accommodation'],
  [{tourism:'museum'},'museum'],
  [{historic:'castle'},'historic'],
  [{tourism:'attraction'},'attraction'],
 ] as const)('normalizes %j', (tags, expected)=>{
  expect(normalizeOsmCategory(tags)).toBe(expected);
 });
 it('does not classify unsupported tags as attractions',()=>{
  expect(normalizeOsmCategory({amenity:'bank'})).toBeNull();
  expect(normalizeOsmCategory({})).toBeNull();
 });
 it('keeps the provisional Wikidata classification explicit',()=>{
  expect(normalizeWikidataCategory()).toBe('attraction');
 });
});
