import { Component, input } from '@angular/core';

@Component({
  selector: 'app-retro-button',
  imports: [],
  templateUrl: './retro-button.component.html',
  styleUrl: './retro-button.component.scss',
})
export class RetroButtonComponent {
  readonly variant = input<'primary' | 'secondary'>('primary');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
}
