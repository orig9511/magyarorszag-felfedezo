import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { isAdSlotConfigured, LandingAdPlacement } from '../../core/config/ads.config';

/**
 * Layout-only ad inventory. This component never loads scripts, requests ad content,
 * sets cookies or initializes AdSense. A future consent-aware adapter must handle that.
 */
@Component({
  selector: 'app-ad-slot',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside *ngIf="visible" class="ad-placement" aria-label="Hirdetési felület">
      <span class="ad-label">Hirdetés</span>
      <div class="ad-frame" aria-hidden="true"></div>
    </aside>
  `,
  styles: [`
    :host { display: contents; }
    .ad-placement { width:min(100%,970px); margin:0 auto; padding:1.5rem 0;
      text-align:center; color:#a9b3a8; }
    .ad-label { display:block; font-size:.7rem; letter-spacing:.12em;
      text-transform:uppercase; margin-bottom:.55rem; }
    .ad-frame { width:100%; min-height:90px; border:1px solid rgba(242,239,230,.12);
      border-radius:5px; background:rgba(255,255,255,.018); }
    @media(max-width:640px) {
      .ad-placement { padding:1rem 0; }
      .ad-frame { min-height:90px; }
    }
  `],
})
export class AdSlotComponent {
  @Input({ required:true }) placement!: LandingAdPlacement;
  /** The hosting page must only enable after an applicable consent decision. */
  @Input() consentGranted = false;
  get visible():boolean {
    return this.consentGranted && isAdSlotConfigured(this.placement);
  }
}
