import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Item of `GET /api/pois/viewport` (the backend POI entity; optional fields are null when unknown). */
export interface Poi {
  id: string;
  name: string;
  description: string | null;
  category: string;
  location: { type: 'Point'; coordinates: [number, number] } | null;
  countyId: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  imageUrl: string | null;
  source: string;
  sourceId: string;
  sponsored: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class POIService {
  private apiUrl = '/api/pois';

  constructor(private http: HttpClient) {}

  getPOIsByViewport(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    categories?: string[],
    countyId?: string,
  ): Observable<Poi[]> {
    let params = new URLSearchParams({
      minLat: minLat.toString(),
      maxLat: maxLat.toString(),
      minLng: minLng.toString(),
      maxLng: maxLng.toString(),
    });

    if (categories && categories.length > 0) {
      params.append('categories', categories.join(','));
    }

    if (countyId) {
      params.append('countyId', countyId);
    }

    return this.http.get<Poi[]>(`${this.apiUrl}/viewport?${params.toString()}`);
  }

  getPOIById(id: string): Observable<Poi> {
    return this.http.get<Poi>(`${this.apiUrl}/${id}`);
  }
}
