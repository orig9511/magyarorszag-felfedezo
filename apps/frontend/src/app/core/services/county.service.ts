import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

type Geometry = {
  type: string;
  coordinates: number[][][][];
};

export interface CountySummary {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  active: boolean;
  attribution?: string;
  geometry?: Geometry;
  displayGeometry?: Geometry;
}

export const countySlug = (county: Pick<CountySummary, "name">): string =>
  county.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

@Injectable({
  providedIn: "root",
})
export class CountyService {
  private apiUrl = "/api/counties";

  constructor(private http: HttpClient) {}

  getAllCounties(): Observable<CountySummary[]> {
    return this.http.get<CountySummary[]>(this.apiUrl).pipe(
      map((counties) =>
        counties.map((county) => ({
          ...county,
          active: county.active ?? true,
          displayGeometry: county.displayGeometry || county.geometry,
          attribution: county.attribution || "Lechner Tudásközpont / Open data",
        })),
      ),
    );
  }

  getCountyById(id: string): Observable<CountySummary> {
    return this.http.get<CountySummary>(`${this.apiUrl}/${id}`);
  }

  getCountyGeometry(id: string): Observable<{ id: string; geometry: Geometry }> {
    return this.http.get<{ id: string; geometry: Geometry }>(`${this.apiUrl}/${id}/geometry`);
  }
}
