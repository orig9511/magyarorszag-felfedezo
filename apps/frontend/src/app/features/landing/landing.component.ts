import { AfterViewInit, Component, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CountyArtComponent } from './county-art.component';
import { CATEGORIES, DISCOVERIES, HERO_IMAGE, STEPS } from './landing-content';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, CountyArtComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  readonly hero = HERO_IMAGE;
  readonly discoveries = DISCOVERIES;
  readonly categories = CATEGORIES;
  readonly steps = STEPS;
  readonly year = new Date().getFullYear();

  /** Number of counties actually returned by the API; null until known (nothing is shown if it fails). */
  countyCount: number | null = null;
  heroImageFailed = false;
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

  onCountiesLoaded(n: number) {
    this.countyCount = n > 0 ? n : null;
  }

  scrollTo(id: string, event: Event) {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }
}
