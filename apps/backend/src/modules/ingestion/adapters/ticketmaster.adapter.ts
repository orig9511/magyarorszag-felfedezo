import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataAdapter, RawEventData } from '../interfaces/data-adapter.interface';

type TicketmasterEvent = {
  id: string;
  name: string;
  info?: string;
  pleaseNote?: string;
  url?: string;
  dates?: {
    timezone?: string;
    start?: { dateTime?: string; localDate?: string; localTime?: string };
    end?: { dateTime?: string };
    status?: { code?: string };
  };
  classifications?: Array<{ segment?: { name?: string }; genre?: { name?: string } }>;
  _embedded?: {
    venues?: Array<{
      name?: string;
      city?: { name?: string };
      location?: { latitude?: string; longitude?: string };
    }>;
    attractions?: Array<{ name?: string }>;
  };
};

type TicketmasterResponse = {
  _embedded?: { events?: TicketmasterEvent[] };
  page?: { number?: number; totalPages?: number };
};

@Injectable()
export class TicketmasterAdapter implements DataAdapter {
  readonly name = 'ticketmaster_discovery';
  readonly type = 'events';
  private readonly logger = new Logger(TicketmasterAdapter.name);
  private readonly baseUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';

  constructor(private readonly configService: ConfigService) {}

  async fetchData(): Promise<RawEventData[]> {
    const apiKey = this.configService.get<string>('TICKETMASTER_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('Ticketmaster API key is missing (TICKETMASTER_API_KEY).');
    }

    const countryCode = this.configService.get<string>('TICKETMASTER_COUNTRY_CODE') || 'HU';
    const size = 100;
    const maxPages = Number(this.configService.get<string>('TICKETMASTER_MAX_PAGES') || '3');
    const records: RawEventData[] = [];

    for (let page = 0; page < maxPages; page++) {
      const url = `${this.baseUrl}?apikey=${encodeURIComponent(apiKey)}&countryCode=${encodeURIComponent(countryCode)}&size=${size}&page=${page}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Momap/1.0 (+https://github.com/orig9511/magyarorszag-felfedezo)',
        },
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(`Ticketmaster API request failed (${response.status} ${response.statusText}).`);
      }

      const payload = (await response.json()) as TicketmasterResponse;
      const events = payload._embedded?.events || [];
      for (const event of events) {
        const normalized = this.normalizeEvent(event);
        if (normalized) {
          records.push(normalized);
        }
      }

      const totalPages = payload.page?.totalPages ?? page + 1;
      if (page + 1 >= totalPages) {
        break;
      }
    }

    this.logger.log(`Fetched ${records.length} Ticketmaster events.`);
    return records;
  }

  validateRecord(record: RawEventData): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!record.externalId) errors.push('externalId required');
    if (!record.title) errors.push('title required');
    if (!record.startTime) errors.push('startTime required');
    if (!record.settlement) errors.push('settlement required');
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private normalizeEvent(event: TicketmasterEvent): RawEventData | null {
    const settlement = event._embedded?.venues?.[0]?.city?.name;
    const startIso = event.dates?.start?.dateTime;
    const fallbackDate = event.dates?.start?.localDate;
    if (!event.id || !event.name || (!startIso && !fallbackDate) || !settlement) {
      return null;
    }
    const lat = Number(event._embedded?.venues?.[0]?.location?.latitude);
    const lon = Number(event._embedded?.venues?.[0]?.location?.longitude);
    const performers = (event._embedded?.attractions || []).map((it) => it.name).filter((name): name is string => Boolean(name));

    const startTime = startIso ? new Date(startIso) : new Date(`${fallbackDate}T00:00:00+02:00`);
    const endTime = event.dates?.end?.dateTime ? new Date(event.dates.end.dateTime) : undefined;

    return {
      externalId: event.id,
      title: event.name,
      description: [event.info, event.pleaseNote].filter(Boolean).join('\n\n') || undefined,
      category: event.classifications?.[0]?.segment?.name?.toLowerCase() || 'other',
      eventType: event.classifications?.[0]?.genre?.name,
      startTime,
      endTime,
      timezone: event.dates?.timezone || 'Europe/Budapest',
      venue: event._embedded?.venues?.[0]?.name,
      latitude: Number.isFinite(lat) ? lat : undefined,
      longitude: Number.isFinite(lon) ? lon : undefined,
      settlement,
      performers,
      sourceUrl: event.url,
      officialEventUrl: event.url,
      ticketUrl: event.url,
      sourceName: 'Ticketmaster Discovery API',
      licenseType: 'ticketmaster-api',
      attribution: 'Ticketmaster Discovery API',
      status: this.normalizeStatus(event.dates?.status?.code),
      lastCheckedAt: new Date(),
    };
  }

  private normalizeStatus(code?: string): 'active' | 'cancelled' | 'postponed' | 'draft' {
    if (!code) return 'active';
    if (code === 'cancelled') return 'cancelled';
    if (code === 'postponed' || code === 'rescheduled') return 'postponed';
    return 'active';
  }
}
