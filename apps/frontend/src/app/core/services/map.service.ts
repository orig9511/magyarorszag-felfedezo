import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class MapService {
  constructor() {}

  initializeMap(
    container: HTMLElement,
    center: [number, number],
    zoom: number,
  ) {
    // MapLibre GL JS initialization
    console.log("Initializing MapLibre GL with center:", center, "zoom:", zoom);
  }

  fitBoundsToCounty(countyGeometry: any) {
    // Fit map bounds to a county polygon
    console.log("Fitting bounds to county:", countyGeometry);
  }
}
