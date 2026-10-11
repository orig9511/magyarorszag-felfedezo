import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MapService } from "./core/services/map.service";
import { POIService } from "./core/services/poi.service";
import { EventService, Event } from "./core/services/event.service";
import { EventListComponent } from "./features/events/event-list.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, EventListComponent],
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

          <div class="tabs">
            <button
              class="tab"
              [class.active]="activeTab === 'pois'"
              (click)="activeTab = 'pois'"
            >
              POIs
            </button>
            <button
              class="tab"
              [class.active]="activeTab === 'events'"
              (click)="activeTab = 'events'"
            >
              Events
            </button>
          </div>

          <div *ngIf="activeTab === 'pois'" class="pois-list">
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

          <div *ngIf="activeTab === 'events'" class="events-section">
            <app-event-list [events]="visibleEvents" [loading]="eventsLoading"></app-event-list>
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
        margin: 0.5rem 0 0 0;
        font-size: 0.95rem;
        opacity: 0.9;
      }

      .main-content {
        display: flex;
        flex: 1;
        overflow: hidden;
      }

      .sidebar {
        width: 380px;
        background: #f8f9fa;
        border-right: 1px solid #e0e0e0;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }

      .filters {
        padding: 1.5rem;
        border-bottom: 1px solid #e0e0e0;
      }

      .filters h2 {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
      }

      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .filter-group label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-size: 0.95rem;
      }

      .filter-group input[type="checkbox"] {
        cursor: pointer;
      }

      .tabs {
        display: flex;
        border-bottom: 1px solid #e0e0e0;
        background: white;
      }

      .tab {
        flex: 1;
        padding: 1rem;
        border: none;
        background: none;
        cursor: pointer;
        font-weight: 500;
        font-size: 0.95rem;
        border-bottom: 3px solid transparent;
        transition: all 0.2s;
      }

      .tab:hover {
        background: #f0f0f0;
      }

      .tab.active {
        color: #667eea;
        border-bottom-color: #667eea;
      }

      .pois-list,
      .events-section {
        flex: 1;
        padding: 1rem;
        overflow-y: auto;
      }

      .pois-list h3,
      .events-section h3 {
        margin: 0 0 1rem 0;
        font-size: 1rem;
      }

      .poi-item {
        padding: 0.75rem;
        background: white;
        border-radius: 0.375rem;
        margin-bottom: 0.75rem;
        border: 1px solid #e0e0e0;
      }

      .poi-item h4 {
        margin: 0 0 0.25rem 0;
        font-size: 0.95rem;
      }

      .poi-item .category {
        margin: 0 0 0.5rem 0;
        display: inline-block;
        background: #f0f0f0;
        padding: 0.2rem 0.4rem;
        border-radius: 0.2rem;
        font-size: 0.8rem;
        color: #666;
      }

      .poi-item .description {
        margin: 0;
        font-size: 0.85rem;
        color: #666;
        line-height: 1.3;
      }

      .empty-state {
        text-align: center;
        color: #999;
        padding: 2rem 0;
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
        background: white;
        padding: 0.5rem 1rem;
        border-top: 1px solid #e0e0e0;
        font-size: 0.85rem;
        color: #666;
      }

      .map-info p {
        margin: 0;
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  @ViewChild("mapElement", { static: false })
  mapElement!: ElementRef;

  visiblePOIs: any[] = [];
  visibleEvents: Event[] = [];
  eventsLoading = false;
  activeTab: "pois" | "events" = "pois";
  mapCenter = { lat: 47.5, lng: 21.6 };
  mapZoom = 10;
  selectedCategories = new Set<string>();

  constructor(
    private mapService: MapService,
    private poiService: POIService,
    private eventService: EventService
  ) {}

  ngOnInit(): void {
    // Load initial events
    this.loadEvents();
  }

  toggleCategory(event: any, category: string): void {
    if (event.target.checked) {
      this.selectedCategories.add(category);
    } else {
      this.selectedCategories.delete(category);
    }
    this.loadEvents();
  }

  private loadEvents(): void {
    // Load events for current viewport (Debrecen area as default)
    const minLat = this.mapCenter.lat - 0.1;
    const maxLat = this.mapCenter.lat + 0.1;
    const minLon = this.mapCenter.lng - 0.1;
    const maxLon = this.mapCenter.lng + 0.1;

    this.eventsLoading = true;
    const categories = Array.from(this.selectedCategories);

    this.eventService
      .getEventsByViewport(minLat, minLon, maxLat, maxLon, {
        categories: categories.length > 0 ? categories : undefined,
        days: 30, // Show events from next 30 days
      })
      .subscribe({
        next: (events) => {
          this.visibleEvents = events;
          this.eventsLoading = false;
        },
        error: (err) => {
          console.error("Failed to load events:", err);
          this.visibleEvents = [];
          this.eventsLoading = false;
        },
      });
  }
}
