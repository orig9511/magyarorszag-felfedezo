import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService, Event } from '../../core/services/event.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="event-list">
      <div class="list-header">
        <h3>Events</h3>
        <span class="count">{{ events.length }}</span>
      </div>

      <div *ngIf="events.length === 0" class="empty-state">
        <p>No events in this area</p>
      </div>

      <ul class="events">
        <li *ngFor="let event of events" class="event-item" [class.sponsored]="event.sponsored">
          <div class="event-header">
            <h4>{{ event.title }}</h4>
            <span *ngIf="event.sponsored" class="sponsored-badge">Sponsored</span>
          </div>

          <div class="event-meta">
            <span class="date">{{ event.startTime | date: 'short' }}</span>
            <span class="category">{{ event.category }}</span>
          </div>

          <p *ngIf="event.description" class="description">{{ event.description | slice: 0: 120 }}...</p>

          <div class="event-footer">
            <span *ngIf="event.venue" class="venue">📍 {{ event.venue }}</span>
            <span *ngIf="event.performers" class="performers">🎤 {{ event.performers }}</span>
          </div>

          <div *ngIf="event.sourceUrl" class="source-link">
            <a [href]="event.sourceUrl" target="_blank" rel="noopener">View Details →</a>
          </div>
        </li>
      </ul>
    </div>
  `,
  styles: [`
    .event-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background: #fff;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 0.5rem;
    }

    .list-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .count {
      background: #f0f0f0;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.85rem;
    }

    .empty-state {
      text-align: center;
      color: #999;
      padding: 1rem 0;
    }

    .events {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 400px;
      overflow-y: auto;
    }

    .event-item {
      padding: 0.75rem;
      border: 1px solid #e0e0e0;
      border-radius: 0.375rem;
      transition: background 0.2s;
    }

    .event-item:hover {
      background: #fafafa;
    }

    .event-item.sponsored {
      border-color: #ffc107;
      background: #fffbf0;
    }

    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .event-header h4 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #333;
    }

    .sponsored-badge {
      background: #ffc107;
      color: #333;
      font-size: 0.7rem;
      padding: 0.2rem 0.4rem;
      border-radius: 0.2rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .event-meta {
      display: flex;
      gap: 0.5rem;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }

    .date {
      color: #666;
    }

    .category {
      background: #f0f0f0;
      padding: 0.1rem 0.35rem;
      border-radius: 0.2rem;
      font-size: 0.8rem;
    }

    .description {
      margin: 0.5rem 0;
      font-size: 0.85rem;
      color: #666;
      line-height: 1.4;
    }

    .event-footer {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.8rem;
      color: #888;
      margin: 0.5rem 0;
    }

    .venue, .performers {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .source-link {
      margin-top: 0.5rem;
    }

    .source-link a {
      font-size: 0.8rem;
      color: #0066cc;
      text-decoration: none;
      font-weight: 500;
    }

    .source-link a:hover {
      text-decoration: underline;
    }
  `],
})
export class EventListComponent implements OnInit, OnDestroy {
  @Input() events: Event[] = [];
  @Input() loading = false;

  private destroy$ = new Subject<void>();

  constructor(private eventService: EventService) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
