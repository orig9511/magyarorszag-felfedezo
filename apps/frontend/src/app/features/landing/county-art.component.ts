import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CountyService, CountySummary, countySlug } from '../../core/services/county.service';

interface ArtCounty {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  d: string;
}

/**
 * Decorative map of Hungary drawn as plain SVG from the real (simplified) county geometries served
 * by the API. It is independent of MapLibre, so it never touches the explorer's map instance.
 */
@Component({
  selector: 'app-county-art',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="art" *ngIf="counties.length">
      <svg [attr.viewBox]="viewBox" role="group" aria-label="Magyarország vármegyéi: válassz egyet a felfedezéshez">
        <ng-container *ngFor="let c of counties; let i = index">
          <a
            [attr.href]="'/explore?county=' + c.slug"
            [attr.aria-label]="c.name + ' vármegye megnyitása a térképen'"
            [class.hover]="c.id === hovered"
            [style.--i]="i"
            (click)="open($event, c)"
            (mouseenter)="hover(c.id)"
            (mouseleave)="hover(null)"
            (focus)="hover(c.id)"
            (blur)="hover(null)"
          >
            <path [attr.d]="c.d" />
          </a>
        </ng-container>
      </svg>
      <figcaption aria-live="polite">{{ hoveredName || 'Válassz vármegyét' }}</figcaption>
    </figure>
  `,
  styles: [
    `
      :host { display: block; }
      .art { margin: 0; }
      svg { display: block; width: 100%; height: auto; overflow: visible; }
      a { cursor: pointer; outline: none; }
      path {
        fill: rgba(198, 240, 90, 0.07);
        stroke: rgba(198, 240, 90, 0.75);
        stroke-width: 1.4;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
        transition: fill 0.25s ease;
      }
      a { animation: draw-in 0.9s ease both; animation-delay: calc(var(--i) * 45ms + 250ms); }
      a.hover path { fill: rgba(198, 240, 90, 0.3); }
      a:focus-visible path { stroke: #f2efe6; stroke-width: 3; fill: rgba(198, 240, 90, 0.3); }
      figcaption {
        margin-top: 0.75rem;
        min-height: 1.4em;
        font-size: 0.8rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #a9b3a8;
        text-align: right;
      }
      @keyframes draw-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      @media (prefers-reduced-motion: reduce) { a { animation: none; } path { transition: none; } }
    `,
  ],
})
export class CountyArtComponent implements OnInit {
  /** Emits the number of counties actually loaded (0 on failure). */
  @Output() loaded = new EventEmitter<number>();

  counties: ArtCounty[] = [];
  viewBox = '0 0 100 60';
  hovered: string | null = null;
  hoveredName = '';

  constructor(
    private countyService: CountyService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit() {
    this.countyService.getAllCounties().subscribe({
      next: (list) => {
        this.build(list.filter((c) => c.displayGeometry));
        this.loaded.emit(this.counties.length);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loaded.emit(0); // decorative only: fail silently
      },
    });
  }

  open(event: Event, county: ArtCounty) {
    event.preventDefault();
    this.router.navigate(['/explore'], { queryParams: { county: county.slug } });
  }

  hover(id: string | null) {
    this.hovered = id;
    this.hoveredName = this.counties.find((c) => c.id === id)?.name ?? '';
    this.cdr.markForCheck();
  }

  private build(list: CountySummary[]) {
    const lat0 = 47.2;
    const kx = Math.cos((lat0 * Math.PI) / 180) * 100; // simple equirectangular fit for Hungary
    const ky = 100;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const project = ([lng, lat]: number[]) => {
      const x = lng * kx;
      const y = -lat * ky;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      return [x, y];
    };
    const raw = list.map((c) => ({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      active: c.active,
      rings: c.displayGeometry!.coordinates.flatMap((poly) => poly.map((ring) => ring.map(project))),
    }));
    const f = (n: number) => (Math.round(n * 10) / 10).toString();
    this.counties = raw.map((c) => ({
      id: c.id,
      name: c.name,
      slug: countySlug({ nameEn: c.nameEn }),
      active: c.active,
      d: c.rings.map((r) => 'M' + r.map(([x, y]) => `${f(x - minX)} ${f(y - minY)}`).join('L') + 'Z').join(''),
    }));
    this.viewBox = `0 0 ${f(maxX - minX)} ${f(maxY - minY)}`;
  }
}
