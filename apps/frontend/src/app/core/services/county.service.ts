import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CountyService {
  private apiUrl = "/api/counties";

  constructor(private http: HttpClient) {}

  getAllCounties(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getCountyById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getCountyGeometry(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/geometry`);
  }
}
