import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS } from '../icons/icons';

/** Single mapping from category key to Lucide icon. Decorative: the text label always sits next to it. */
@Component({
  selector: 'app-category-icon',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @switch (category) {
      @case ('attraction') { <lucide-icon [img]="icons.Landmark" [size]="size" [strokeWidth]="1.75"></lucide-icon> }
      @case ('restaurant') { <lucide-icon [img]="icons.Utensils" [size]="size" [strokeWidth]="1.75"></lucide-icon> }
      @case ('accommodation') { <lucide-icon [img]="icons.BedDouble" [size]="size" [strokeWidth]="1.75"></lucide-icon> }
      @case ('event') { <lucide-icon [img]="icons.CalendarDays" [size]="size" [strokeWidth]="1.75"></lucide-icon> }
      @case ('nature') { <lucide-icon [img]="icons.Trees" [size]="size" [strokeWidth]="1.75"></lucide-icon> }
      @default { <lucide-icon [img]="icons.MapPin" [size]="size" [strokeWidth]="1.75"></lucide-icon> }
    }
  `,
  styles: [':host { display: inline-flex; flex: none; } :host ::ng-deep svg { display: block; }'],
})
export class CategoryIconComponent {
  readonly icons = ICONS;
  @Input() category = '';
  @Input() size = 16;
}
