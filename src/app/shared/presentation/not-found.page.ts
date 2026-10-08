import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../core/config/locale.service';

@Component({
  selector: 'ichu-not-found', standalone: true, imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="empty-state"><span class="eyebrow">404</span><h1>{{ locale.text('This path is not in the herd.', 'Este camino no está en el hato.') }}</h1><p>{{ locale.text('Check the address or return to your workspace.', 'Revisa la dirección o vuelve a tu espacio de trabajo.') }}</p><a class="btn primary" routerLink="/dashboard">{{ locale.text('Back to my herd', 'Volver a mi hato') }}</a></section>`,
  styles: '.empty-state{display:grid;justify-items:center;gap:20px;margin:80px auto;max-width:660px}',
})
export class NotFoundPage { readonly locale = inject(LocaleService); }
