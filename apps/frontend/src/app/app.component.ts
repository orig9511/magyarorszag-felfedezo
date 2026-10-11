import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { MapService } from "./core/services/map.service";
import { POIService } from "./core/services/poi.service";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <header class="header">
        <h1>Magyarország Felfedezője</h1>
        <p class="subtitle">Premium Tourism Discovery Platform</p>
      </header>

      <main class="main-content">
        <aside class="sidebar">
          <div class="filters">
            <h2>Filters</h2>
            <div class="filter-group">
              <label>
                <input
                  type="checkbox"
                  (change)="toggleCategory($event, 'attraction')"
                />
                Attractions
              </label>
              <label>
                <input
                  type="checkbox"
                  (change)="toggleCategory($event, 'restaurant')"
                />
                Restaurants
              </label>
              <label>
                <input
                  type="checkbox"
                  (change)="toggleCategory($event, 'accommodation')"
                />
                Accommodation
              </label>
              <label>
                <input
                  type="checkbox"
                  (change)="toggleCategory($event, 'event')"
                />
                Events
              </label>
            </div>
          </div>

          <div class="pois-list">
            <h3>Points of Interest</h3>
            <div class="poi-item" *ngFor="let poi of visiblePOIs">
              <h4>{{ poi.name }}</h4>
              <p class="category">{{ poi.category }}</p>
              <p class="description">{{ poi.description }}</p>
            </div>
            <div class="empty-state" *ngIf="visiblePOIs.length === 0">
              <p>Zoom in or pan to see points of interest</p>
            </div>
          </div>
        </aside>

        <div class="map-container">
          <div #mapElement class="map"></div>
          <div class="map-info">
            <p>
              {{ mapCenter.lat.toFixed(4) }}, {{ mapCenter.lng.toFixed(4) }} |
              Zoom: {{ mapZoom }}
            </p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .container {
        height: 100vh;
        display: flex;
        flex-direction: column;
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
          Cantarell, sans-serif;
      }

      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .header h1 {
        margin: 0;
        font-size: 2rem;
        font-weight: 700;
      }

      .subtitle {
        margin: 0.5rem 0 0;
        opacity: 0.9;
        font-size: 1rem;
      }

      .main-content {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .sidebar {
        width: 320px;
        background: #f8f9fa;
        border-right: 1px solid #e0e0e0;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }

      .filters,
      .pois-list {
        padding: 1.5rem;
        border-bottom: 1px solid #e0e0e0;
      }

      .filters h2 {
        margin: 0 0 1rem;
        font-size: 1.1rem;
        font-weight: 600;
      }

      .filter-group label {
        display: flex;
        align-items: center;
        margin-bottom: 0.75rem;
        cursor: pointer;
        font-size: 0.95rem;
      }

      .filter-group input {
        margin-right: 0.75rem;
        cursor: pointer;
      }

      .pois-list {
        flex: 1;
        overflow-y: auto;
      }

      .pois-list h3 {
        margin: 0 0 1rem;
        font-size: 1rem;
        font-weight: 600;
      }

      .poi-item {
        margin-bottom: 1rem;
        padding: 0.75rem;
        background: white;
        border-radius: 6px;
        border: 1px solid #e0e0e0;
        cursor: pointer;
        transition: all 0.2s;
      }

      .poi-item:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        border-color: #667eea;
      }

      .poi-item h4 {
        margin: 0 0 0.25rem;
        font-size: 0.95rem;
        font-weight: 600;
      }

      .poi-item .category {
        margin: 0;
        font-size: 0.8rem;
        color: #667eea;
        font-weight: 500;
      }

      .poi-item .description {
        margin: 0.25rem 0 0;
        font-size: 0.85rem;
        color: #666;
        line-height: 1.3;
      }

      .empty-state {
        text-align: center;
        padding: 2rem 1rem;
        color: #999;
        font-size: 0.9rem;
      }

      .map-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        position: relative;
      }

      .map {
        flex: 1;
        background: #e0e0e0;
      }

      .map-info {
        padding: 0.75rem 1rem;
        background: white;
        border-top: 1px solid #e0e0e0;
        font-size: 0.85rem;
        color: #666;
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  @ViewChild("mapElement") mapElement!: ElementRef;

  mapCenter = { lat: 47.1625, lng: 19.5033 }; // Center of Hungary
  mapZoom = 7;
  visiblePOIs: any[] = [];
  selectedCategories: Set<string> = new Set();

  constructor(
    private mapService: MapService,
    private poiService: POIService,
  ) {}

  ngOnInit() {
    this.initializeMap();
  }

  private initializeMap() {
    // MapLibre GL initialization will happen here
    console.log("Map initialization starting...");
  }

  toggleCategory(event: any, category: string) {
    if (event.target.checked) {
      this.selectedCategories.add(category);
    } else {
      this.selectedCategories.delete(category);
    }
    this.loadPOIs();
  }

  private loadPOIs() {
    // POI loading will happen based on map viewport
    console.log(
      "Loading POIs for categories:",
      Array.from(this.selectedCategories),
    );
  }
}
