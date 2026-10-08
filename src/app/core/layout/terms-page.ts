import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../config/locale.service';

@Component({
  selector: 'ichu-terms-page', standalone: true, imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<article class="terms"><a class="btn secondary" routerLink="/dashboard">{{ locale.text('Back to workspace', 'Volver al espacio de trabajo') }}</a><h1>{{ locale.text('Terms & privacy', 'Términos y privacidad') }}</h1><p>{{ locale.text('ICHU by SmartFarm. Updated October 8, 2026.', 'ICHU de SmartFarm. Actualizado el 8 de octubre de 2026.') }}</p><h2>{{ locale.text('Data handling', 'Tratamiento de datos') }}</h2><p>{{ locale.text('Records remain in memory until the page is reloaded. Do not enter sensitive personal, financial or clinical information.', 'Los registros permanecen en memoria hasta recargar la página. No ingreses información personal, financiera ni clínica sensible.') }}</p><h2>{{ locale.text('No external operations', 'Sin operaciones externas') }}</h2><p>{{ locale.text('Identity, payments, GPS, notifications and device operations are not connected. Nothing here constitutes a veterinary diagnosis or an actual subscription.', 'La identidad, pagos, GPS, notificaciones y operaciones de dispositivos no están conectados. Nada aquí constituye un diagnóstico veterinario ni una suscripción real.') }}</p><h2>{{ locale.text('Browser preferences', 'Preferencias del navegador') }}</h2><p>{{ locale.text('Only the selected language is saved locally. No passwords, payment details or session tokens are stored.', 'Solo se guarda localmente el idioma seleccionado. No se almacenan contraseñas, datos de pago ni tokens de sesión.') }}</p></article>`,
  styles: '.terms{max-width:760px;margin:48px auto;padding:24px;display:grid;gap:24px}.terms p{color:var(--muted);line-height:1.8}',
})
export class TermsPage { readonly locale = inject(LocaleService); }
