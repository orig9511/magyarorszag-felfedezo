import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CountyArtComponent } from './county-art.component';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../../shared/icons/icons';
import { CATEGORIES, HERO, INSPIRATIONS, STEPS } from './landing-content';
import { AttributionDialogComponent } from '../../shared/attribution-dialog/attribution-dialog.component';
import { CategoryIconComponent } from '../../shared/icons/category-icon.component';
import { LEGAL_LINKS, SOCIAL_LINKS } from '../../core/config/site.config';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule, RouterLink, CountyArtComponent, AttributionDialogComponent, CategoryIconComponent,
    LucideAngularModule,
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  readonly icons = ICONS;
  readonly hero = HERO;
  readonly categories = CATEGORIES;
  readonly inspirations = INSPIRATIONS;
  readonly steps = STEPS;
  readonly socialLinks = SOCIAL_LINKS;
  readonly legalLinks = LEGAL_LINKS;
  readonly year = new Date().getFullYear();

  /** Number of counties actually returned by the API; null until known (nothing is shown if it fails). */
  countyCount: number | null = null;
  menuOpen = false;
  failedImages = new Set<string>();

  private observer?: IntersectionObserver;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    const el = this.host.nativeElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return; // content stays visible without animation

    el.classList.add('reveal-ready');
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            this.observer?.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    el.querySelectorAll('.reveal').forEach((n) => this.observer!.observe(n));
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  @HostListener('document:keydown.escape')
  closeMenu() {
    this.menuOpen = false;
  }

  onCountiesLoaded(n: number) {
    this.countyCount = n > 0 ? n : null;
  }

  scrollTo(id: string, event: Event) {
    event.preventDefault();
    this.menuOpen = false;
    const target = document.getElementById(id);
    if (!target) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }
}
