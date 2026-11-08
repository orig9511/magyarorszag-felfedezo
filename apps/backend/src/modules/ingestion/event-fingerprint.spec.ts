import { eventFingerprint, normalizeEventText } from './event-fingerprint';
describe('cross-source event fingerprint',()=>{
 const base={title:'Jazz Est',startTime:new Date('2026-11-08T18:00:00Z'),venue:'Kölcsey Központ',settlement:'Debrecen'};
 it('normalizes accents, case and punctuation',()=>{
  expect(normalizeEventText('  KÖLCSEY - Központ ')).toBe('kolcsey kozpont');
 });
 it('matches same event across distinct sources',()=>{
  expect(eventFingerprint(base)).toBe(eventFingerprint({...base,title:'JAZZ-EST',venue:'Kolcsey kozpont'}));
 });
 it('does not match another date or venue',()=>{
  expect(eventFingerprint(base)).not.toBe(eventFingerprint({...base,startTime:new Date('2026-11-09T18:00:00Z')}));
  expect(eventFingerprint(base)).not.toBe(eventFingerprint({...base,venue:'Másik helyszín'}));
 });
 it('refuses to infer duplicates from settlement alone',()=>{
  expect(eventFingerprint({...base,venue:undefined})).toBeNull();
 });
});
