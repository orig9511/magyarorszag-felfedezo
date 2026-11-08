import { createHash } from 'crypto';
import { RawEventData } from './interfaces/data-adapter.interface';

/** Conservative cross-source event matching. Only exact normalized title + local day + venue/settlement. */
export function normalizeEventText(value:string|undefined):string {
 return (value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('hu-HU').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
export function eventLocalDay(value:Date):string {
 if(!(value instanceof Date)||!Number.isFinite(value.getTime()))throw new Error('Invalid event start time');
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
}
export function eventFingerprint(record:Pick<RawEventData,'title'|'startTime'|'venue'|'settlement'>):string|null {
 const title=normalizeEventText(record.title);
 const place=normalizeEventText(record.venue)||normalizeEventText(record.settlement);
 if(title.length<5||place.length<3)return null;
 const canonical=[title,eventLocalDay(record.startTime),place].join('|');
 return createHash('sha256').update(canonical).digest('hex');
}
