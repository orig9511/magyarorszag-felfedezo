import { selectedIngestionRegion, withinRegion } from './region-config';
describe('ingestion region configuration',()=>{
 const previous=process.env.MOMAP_INGESTION_REGION;
 afterEach(()=>{
  if(previous===undefined)delete process.env.MOMAP_INGESTION_REGION;
  else process.env.MOMAP_INGESTION_REGION=previous;
 });
 it('defaults to the registered Debrecen pilot',()=>{
  delete process.env.MOMAP_INGESTION_REGION;
  expect(selectedIngestionRegion().id).toBe('debrecen-pilot');
 });
 it('rejects unknown region identifiers',()=>{
  process.env.MOMAP_INGESTION_REGION='unreviewed-region';
  expect(()=>selectedIngestionRegion()).toThrow('Unreviewed ingestion region');
 });
 it('checks the pilot bbox including boundaries',()=>{
  const region=selectedIngestionRegion();
  expect(withinRegion(47.52,21.65,region)).toBe(true);
  expect(withinRegion(47.5,21.6,region)).toBe(true);
  expect(withinRegion(47.49,21.65,region)).toBe(false);
  expect(withinRegion(NaN,21.65,region)).toBe(false);
 });
});
