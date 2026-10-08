import { Injectable, computed, signal } from '@angular/core';

export type WorkspaceRole = 'rancher' | 'veterinarian';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  readonly role = signal<WorkspaceRole>('rancher');
  readonly herdId = signal('esperanza');
  readonly now = '2026-10-08T10:30:00-05:00';
  readonly herds = [
    { id: 'esperanza', name: 'Fundo La Esperanza', region: 'Junín · Sapallanga' },
    { id: 'pucara', name: 'Fundo Pucará', region: 'Puno · Juliaca' },
  ] as const;
  readonly herdName = computed(() => this.herds.find(herd => herd.id === this.herdId())?.name ?? '');

  selectHerd(id: string): void {
    if (this.herds.some(herd => herd.id === id)) this.herdId.set(id);
  }

  selectRole(value: string): void {
    if (value === 'rancher' || value === 'veterinarian') this.role.set(value);
  }
}
