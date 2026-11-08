import { SpatialCountyResolver } from './spatial-county-resolver.service';
describe('SpatialCountyResolver (mock repository)',()=>{
 const query=jest.fn();
 const resolver=new SpatialCountyResolver({query} as any);
 beforeEach(()=>query.mockReset());
 it('returns a county for exactly one polygon match',async()=>{
  query.mockResolvedValueOnce([{id:'county-a'}]);
  await expect(resolver.resolve(21.62,47.52)).resolves.toBe('county-a');
  expect(query).toHaveBeenCalledWith(expect.stringContaining('ST_Covers'),[21.62,47.52]);
 });
 it('does not guess a county for points outside polygons',async()=>{
  query.mockResolvedValueOnce([]);
  await expect(resolver.resolve(21.62,47.52)).resolves.toBeNull();
 });
 it('does not guess a county on shared polygon borders',async()=>{
  query.mockResolvedValueOnce([{id:'county-a'},{id:'county-b'}]);
  await expect(resolver.resolve(21.62,47.52)).resolves.toBeNull();
 });
 it.each([[181,47],[21,91],[NaN,47],[21,Infinity]])('rejects invalid coordinates',async(lon,lat)=>{
  await expect(resolver.resolve(lon,lat)).rejects.toThrow('Invalid coordinates');
  expect(query).not.toHaveBeenCalled();
 });
});
