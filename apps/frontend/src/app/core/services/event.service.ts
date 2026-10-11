import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Event {
  id: string;
  title: string;
  description?: string;
  category: string;
  startTime: Date;
  endTime?: Date;
  venue?: string;
  location?: { type: string; coordinates: [number, number] };
  countyId: string;
  settlement: string;
  performers?: string;
  sourceUrl?: string;
  status: string;
  sponsored: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private baseUrl = '/api/events';

  constructor(private http: HttpClient) {}

  /**
   * Get events within viewport bounds.
   */
  getEventsByViewport(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
    options?: { categories?: string[]; countyId?: string; days?: number },
  ): Observable<Event[]> {
    let params = new HttpParams()
      .set('minLat', minLat.toString())
      .set('minLon', minLon.toString())
      .set('maxLat', maxLat.toString())
      .set('maxLon', maxLon.toString());

    if (options?.categories && options.categories.length > 0) {
      params = params.set('categories', options.categories.join(','));
    }
    if (options?.countyId) {
      params = params.set('countyId', options.countyId);
    }
    if (options?.days) {
      params = params.set('days', options.days.toString());
    }

    return this.http.get<Event[]>(`${this.baseUrl}/viewport`, { params });
  }

  /**
   * Get upcoming events for a county.
   */
  getUpcomingEvents(countyId: string, days = 7): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.baseUrl}/upcoming/${countyId}`, {
      params: new HttpParams().set('days', days.toString()),
    });
  }

  /**
   * Get event by ID.
   */
  getEventById(id: string): Observable<Event> {
    return this.http.get<Event>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get all active events (paginated).
   */
  getAllEvents(limit = 50, offset = 0): Observable<Event[]> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    return this.http.get<Event[]>(this.baseUrl, { params });
  }

  /**
   * Create an event.
   */
  createEvent(event: Partial<Event>): Observable<Event> {
    return this.http.post<Event>(this.baseUrl, event);
  }

  /**
   * Update an event.
   */
  updateEvent(id: string, event: Partial<Event>): Observable<Event> {
    return this.http.patch<Event>(`${this.baseUrl}/${id}`, event);
  }

  /**
   * Cancel an event.
   */
  cancelEvent(id: string): Observable<Event> {
    return this.http.patch<Event>(`${this.baseUrl}/${id}/cancel`, {});
  }
}
