import { extractTicketEvents } from './ticket-jsonld';
const url='https://tickets.example.test/event/123?utm_source=test';
const event={ '@type':'MusicEvent',name:'Őszi Jazz Est',startDate:'2026-11-22T19:30:00+01:00',
 location:{'@type':'Place',name:'Kölcsey Központ',address:{addressLocality:'Debrecen'}},
 url:'https://tickets.example.test/event/123?utm_source=campaign'};
const html=(data:unknown)=>'<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
describe('review-only structured ticket extraction',()=>{
 it('extracts valid event graph and strips tracking IDs',()=>{
  const rows=extractTicketEvents(html({'@graph':[{'@type':'WebSite'},event]}),url,'Test','CC-BY-4.0','Test attribution');
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({title:'Őszi Jazz Est',settlement:'Debrecen',venue:'Kölcsey Központ',status:'draft',sourceUrl:'https://tickets.example.test/event/123'});
 });
 it('keeps two showtimes distinct',()=>{
  const rows=extractTicketEvents(html([event,{...event,startDate:'2026-11-22T21:30:00+01:00'}]),url,'Test','CC-BY-4.0','Test');
  expect(rows).toHaveLength(2);
  expect(rows[0].externalId).not.toBe(rows[1].externalId);
 });
 it('drops ambiguous dates, missing venue and invalid JSON',()=>{
  expect(extractTicketEvents(html({...event,startDate:'2026-11-22'}),url,'T','CC0','T')).toHaveLength(0);
  expect(extractTicketEvents(html({...event,location:{name:'Venue'}}),url,'T','CC0','T')).toHaveLength(0);
  expect(extractTicketEvents('<script type="application/ld+json">{invalid</script>',url,'T','CC0','T')).toHaveLength(0);
 });
});
