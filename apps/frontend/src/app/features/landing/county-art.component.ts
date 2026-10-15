import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CountyService, CountySummary, countySlug } from '../../core/services/county.service';

interface ArtCounty {
  id: string;
  name: string;
  slug: string;
  d: string;
  active: boolean;
}

type Point2D = [number, number];

// Equirectangular fit around Hungary's mid latitude; 100 SVG units = 1 degree of latitude.
const LAT0 = 47.2;
const UNITS_PER_DEG = 100;
const KM_PER_DEG_LAT = 111.19;

/**
 * Interactive map of Hungary drawn as plain SVG from the real (simplified) county geometries served
 * by the API. It is independent of MapLibre, so it never touches the explorer's map instance.
 */
@Component({
  selector: 'app-county-art',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stage" [attr.data-state]="state">
      <svg *ngIf="state === 'ready'" [attr.viewBox]="viewBox" role="group" aria-label="Magyarország vármegyéi: válassz egyet a felfedezéshez">
        <ng-container *ngFor="let c of counties; let i = index">
          <a
            [attr.href]="c.active ? '/explore?county=' + c.slug : null"
            [attr.aria-disabled]="!c.active"
            [attr.tabindex]="c.active ? 0 : -1"
            [class.inactive]="!c.active"
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
      <div class="scale" *ngIf="state === 'ready'" [style.width.%]="scalePct" role="img" aria-label="Méretarány: a sáv hossza 100 kilométert jelent">
        <span class="bar"></span>
        <span class="lbl">100 km</span>
      </div>

      <p class="status" *ngIf="state === 'loading'" role="status">Vármegyetérkép betöltése…</p>
      <div class="status error" *ngIf="state === 'error'" role="alert">
        <p>A vármegyetérkép most nem tölthető be.</p>
        <button type="button" (click)="load()">Újrapróbálom</button>
        <p class="alt">Közben a <a href="/explore">teljes térkép</a> így is elérhető.</p>
      </div>
    </div>

    <div class="foot" *ngIf="state === 'ready'">
      <p class="hint" aria-live="polite">{{ hoveredName || 'Kattints egy vármegyére a felfedezéshez' }}</p>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .stage { position: relative; min-height: 14rem; }
      svg { display: block; width: 100%; height: auto; overflow: visible; filter: drop-shadow(0 0 7px rgba(198, 240, 90, 0.28)); }
      a { cursor: pointer; outline: none; animation: draw-in 0.9s ease both; animation-delay: calc(var(--i) * 40ms + 200ms); }
      path {
        fill: rgba(198, 240, 90, 0.08);
        stroke: rgba(198, 240, 90, 0.85);
        stroke-width: 1.4;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
        transition: fill 0.25s ease;
      }
      a.hover path { fill: rgba(198, 240, 90, 0.38); }
      a.inactive { opacity: .35; cursor: default; }
      a:focus-visible path { stroke: #f2efe6; stroke-width: 3; fill: rgba(198, 240, 90, 0.38); }
      .status { margin: 0; padding: 3rem 1rem; text-align: center; color: #a9b3a8; font-size: 0.95rem; }
      .status.error { color: #f2efe6; }
      .status.error p { margin: 0 0 0.75rem; }
      .status .alt { margin-top: 0.75rem; font-size: 0.85rem; color: #a9b3a8; }
      .status a { color: #c6f05a; }
      .status button {
        border: 1px solid #c6f05a; background: transparent; color: #c6f05a; padding: 0.5rem 1.1rem;
        cursor: pointer; font: inherit; border-radius: 2px;
      }
      .status button:hover { background: rgba(198, 240, 90, 0.12); }
      .status button:focus-visible, .status a:focus-visible { outline: 2px solid #c6f05a; outline-offset: 2px; }
      .foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; margin-top: 0.9rem; }
      .hint { margin: 0; min-height: 2.6em; max-width: 14rem; font-size: 0.85rem; color: #d9dccf; line-height: 1.35; }
      .scale { position: absolute; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; font-size: 0.72rem; color: #a9b3a8; }
      .bar { display: block; width: 100%; height: 6px; border: 1px solid #a9b3a8; border-top: 0; }
      @keyframes draw-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      @media (prefers-reduced-motion: reduce) { a { animation: none; } path { transition: none; } }
    `,
  ],
})
export class CountyArtComponent implements OnInit {
  /** Emits the number of counties actually loaded (0 on failure). */
  @Output() loaded = new EventEmitter<number>();

  state: 'loading' | 'ready' | 'error' = 'loading';
  counties: ArtCounty[] = [];
  viewBox = '0 0 100 60';
  /** Width of a real 100 km in the current projection, as a percentage of the map width. */
  scalePct = 0;
  hovered: string | null = null;
  hoveredName = '';

  constructor(
    private countyService: CountyService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.state = 'loading';
    this.cdr.markForCheck();
    this.countyService.getAllCounties().subscribe({
      next: (list) => {
        this.build(list.filter((c) => c.displayGeometry));
        this.state = this.counties.length ? 'ready' : 'error';
        this.loaded.emit(this.counties.length);
        this.cdr.markForCheck();
      },
      error: () => {
        this.state = 'error';
        this.loaded.emit(0);
        this.cdr.markForCheck();
      },
    });
  }

  open(event: Event, county: ArtCounty) {
    event.preventDefault();
    if (!county.active) return;
    this.router.navigate(['/explore'], { queryParams: { county: county.slug } });
  }

  hover(id: string | null) {
    this.hovered = id;
    this.hoveredName = this.counties.find((c) => c.id === id)?.name ?? '';
    this.cdr.markForCheck();
  }

  private build(list: CountySummary[]) {
    const kx = Math.cos((LAT0 * Math.PI) / 180) * UNITS_PER_DEG;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const project = ([lng, lat]: number[]) => {
      const x = lng * kx;
      const y = -lat * UNITS_PER_DEG;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      return [x, y];
    };
    const raw = list.map((c): { id: string; name: string; slug: string; active: boolean; rings: Point2D[][] } => ({
      id: c.id,
      name: c.name,
      slug: countySlug(c),
      active: c.active,
      rings: c.displayGeometry!.coordinates.flatMap((poly: number[][][]) =>
        poly.map((ring: number[][]) => ring.map(project) as Point2D[]),
      ),
    }));
    const f = (n: number) => (Math.round(n * 10) / 10).toString();
    this.counties = raw.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      active: c.active,
      d: c.rings
        .map((r: Point2D[]) => 'M' + r.map(([x, y]: Point2D) => `${f(x - minX)} ${f(y - minY)}`).join('L') + 'Z')
        .join(''),
    }));
    const w = maxX - minX;
    this.viewBox = `0 0 ${f(w)} ${f(maxY - minY)}`;
    this.scalePct = Math.round(((100 / KM_PER_DEG_LAT) * UNITS_PER_DEG / w) * 1000) / 10;
  }
}
