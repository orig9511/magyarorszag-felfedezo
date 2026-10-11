import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

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
  ): Observable<any[]> {
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

    return this.http.get<any[]>(`${this.apiUrl}/viewport?${params.toString()}`);
  }

  getPOIById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}
