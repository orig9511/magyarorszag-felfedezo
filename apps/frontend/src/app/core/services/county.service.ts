import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Item of `GET /api/counties`: metadata plus the simplified overview geometry (GeoJSON). */
export interface CountySummary {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  active: boolean;
  displayGeometry: GeoJSON.MultiPolygon | null;
  license: string | null;
  attribution: string | null;
}

/** `GET /api/counties/:id/geometry`: the accurate, full-resolution geometry. */
export interface CountyGeometry {
  id: string;
  geometry: GeoJSON.MultiPolygon;
}

/** URL-safe county identifier derived from the English name, e.g. 'Hajdu-Bihar' -> 'hajdu-bihar'. */
export function countySlug(county: Pick<CountySummary, 'nameEn'>): string {
  return county.nameEn
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable({
  providedIn: 'root',
})
export class CountyService {
  private apiUrl = '/api/counties';

  constructor(private http: HttpClient) {}

  getAllCounties(): Observable<CountySummary[]> {
    return this.http.get<CountySummary[]>(this.apiUrl);
  }

  getCountyById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getCountyGeometry(id: string): Observable<CountyGeometry> {
    return this.http.get<CountyGeometry>(`${this.apiUrl}/${id}/geometry`);
  }
}
