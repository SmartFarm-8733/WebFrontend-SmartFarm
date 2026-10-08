import { Injectable, inject, signal } from '@angular/core';
import { WorkspaceRole, WorkspaceService } from './workspace.service';

/** Demonstration state only. Production identity and authorization belong to the backend. */
@Injectable({ providedIn: 'root' })
export class DemoSessionService {
  private readonly workspace = inject(WorkspaceService);
  readonly active = signal(false);
  readonly name = signal('Próspero Contreras');

  enter(role: WorkspaceRole, name?: string): void {
    this.workspace.role.set(role);
    this.workspace.selectHerd('esperanza');
    this.name.set(name?.trim().slice(0, 80) || (role === 'rancher' ? 'Próspero Contreras' : 'Darwin Carbajal'));
    this.active.set(true);
  }

  leave(): void {
    this.active.set(false);
    this.workspace.selectHerd('esperanza');
  }
}
