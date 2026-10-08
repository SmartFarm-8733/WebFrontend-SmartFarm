import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { Icon } from '../../shared/presentation/icon';
import { LocaleService } from '../config/locale.service';
import { WorkspaceService } from '../config/workspace.service';
import { DemoSessionService } from '../config/demo-session.service';

@Component({
  selector: 'ichu-shell', standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html', styleUrl: './shell.scss',
})
export class Shell {
  readonly locale = inject(LocaleService);
  readonly workspace = inject(WorkspaceService);
  readonly session = inject(DemoSessionService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly groups = [
    { en: 'Herd', es: 'Hato', links: [
      { path: '/dashboard', icon: 'grid', en: 'My herd', es: 'Mi hato' },
      { path: '/cattle', icon: 'cattle', en: 'Animals', es: 'Animales' },
      { path: '/locations', icon: 'pin', en: 'Location & fences', es: 'Ubicación y geocercas' },
    ] },
    { en: 'Field & care', es: 'Campo y atención', links: [
      { path: '/monitoring', icon: 'pulse', en: 'Monitoring', es: 'Monitoreo' },
      { path: '/alerts', icon: 'bell', en: 'Alerts', es: 'Alertas' },
      { path: '/health', icon: 'health', en: 'Clinical history', es: 'Historial clínico' },
      { path: '/planning', icon: 'calendar', en: 'Health planning', es: 'Planificación sanitaria' },
      { path: '/nutrition', icon: 'leaf', en: 'Nutrition', es: 'Nutrición' },
      { path: '/reproduction', icon: 'cattle', en: 'Reproduction', es: 'Reproducción' },
      { path: '/reports', icon: 'chart', en: 'Reports', es: 'Reportes' },
    ] },
    { en: 'Workspace', es: 'Administración', links: [
      { path: '/devices', icon: 'radio', en: 'IoT devices', es: 'Dispositivos IoT' },
      { path: '/advisories', icon: 'users', en: 'Advisory access', es: 'Asesorías' },
      { path: '/plans', icon: 'card', en: 'My plan', es: 'Mi plan' },
      { path: '/account', icon: 'users', en: 'My account', es: 'Mi cuenta' },
    ] },
  ];

  constructor() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => {
      this.menuOpen.set(false);
      requestAnimationFrame(() => document.getElementById('workspace-content')?.focus({ preventScroll: true }));
    });
  }

  selectHerd(event: Event): void {
    if (event.target instanceof HTMLSelectElement) this.workspace.selectHerd(event.target.value);
  }

  selectRole(event: Event): void {
    if (event.target instanceof HTMLSelectElement) this.workspace.selectRole(event.target.value);
  }

  selectLocale(event: Event): void {
    if (event.target instanceof HTMLSelectElement) this.locale.setLocale(event.target.value);
  }

  signOut(): void {
    this.session.leave();
    void this.router.navigateByUrl('/login');
  }
}
