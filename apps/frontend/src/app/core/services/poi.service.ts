import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Poi {
  id: string;
  name: string;
  description?: string;
  category: string;
  location?: { type: string; coordinates: [number, number] };
  countyId: string;
  address?: string;
  phone?: string;
  website?: string;
  imageUrl?: string;
  source: string;
  sourceId: string;
  sponsored: boolean;
  attribution?: string;
}

@Injectable({
  providedIn: "root",
})
export class POIService {
  private apiUrl = "/api/pois";

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
      params.append("categories", categories.join(","));
    }

    if (countyId) {
      params.append("countyId", countyId);
    }

    return this.http.get<Poi[]>(`${this.apiUrl}/viewport?${params.toString()}`);
  }

  getPOIById(id: string): Observable<Poi> {
    return this.http.get<Poi>(`${this.apiUrl}/${id}`);
  }
}
