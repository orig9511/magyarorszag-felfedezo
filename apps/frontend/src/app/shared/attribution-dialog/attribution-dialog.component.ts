import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../icons/icons';
import { ALL_CREDITS } from '../../features/landing/landing-content';

/**
 * Data-source and licence notices, single source of truth. Uses the native <dialog> modal, which gives
 * a focus trap, inert background, Escape handling and focus restoration to the opener.
 * Usage: <app-attribution-dialog #attr /> ... <button (click)="attr.open()">
 */
@Component({
  selector: 'app-attribution-dialog',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './attribution-dialog.component.html',
  styleUrls: ['./attribution-dialog.component.scss'],
})
export class AttributionDialogComponent {
  readonly icons = ICONS;
  @ViewChild('dlg', { static: true }) private dlg!: ElementRef<HTMLDialogElement>;
  readonly credits = ALL_CREDITS;
  private opener: HTMLElement | null = null;

  open() {
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!this.dlg.nativeElement.open) this.dlg.nativeElement.showModal();
  }

  close() {
    this.dlg.nativeElement.close();
  }

  /** Runs for every close path (button, Escape, backdrop). */
  onClosed() {
    this.opener?.focus();
    this.opener = null;
  }

  /** Only a click on the backdrop itself closes; clicks inside the panel have a different target. */
  onDialogClick(event: MouseEvent) {
    if (event.target === this.dlg.nativeElement) this.close();
  }
}
