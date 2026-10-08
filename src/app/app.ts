import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { LocaleService } from './core/config/locale.service';

@Component({
  selector: 'ichu-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  private readonly title = inject(Title);
  private readonly locale = inject(LocaleService);

  constructor() {
    effect(() => this.title.setTitle(this.locale.text('ICHU · Herd management', 'ICHU · Gestión ganadera')));
  }
}
