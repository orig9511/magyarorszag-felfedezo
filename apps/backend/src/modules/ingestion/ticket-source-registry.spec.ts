import {approvedTicketSource} from './ticket-source-registry';
describe('ticket source compliance guard',()=>{
 it('fails closed for all discovery-only sources',()=>{
  for(const id of ['jegyhu','cooltix','eventim'])expect(()=>approvedTicketSource(id)).toThrow('not approved');
 });
 it('rejects arbitrary domains',()=>{
  expect(()=>approvedTicketSource('https://localhost')).toThrow('not approved');
 });
});
