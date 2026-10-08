import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../../core/config/locale.service';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { IdentityFacade } from '../application/identity.facade';
import { type AdvisoryAction, type AdvisoryResult, type HerdAdvisory } from '../domain/identity.repository';
import { IDENTITY_REPOSITORY_PROVIDER } from '../infrastructure/mock-identity.adapter';

@Component({
  selector: 'ichu-advisories-page', standalone: true,
  imports: [MatButtonModule, RouterLink],
  providers: [IdentityFacade, IDENTITY_REPOSITORY_PROVIDER],
  templateUrl: './advisories-page.html', styleUrl: './advisories-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvisoriesPage {
  readonly locale = inject(LocaleService);
  readonly workspace = inject(WorkspaceService);
  readonly facade = inject(IdentityFacade);
  readonly actionResult = signal<AdvisoryResult | null>(null);

  specialtyLabel(specialty: HerdAdvisory['specialty']): string {
    return specialty === 'herd-health'
      ? this.locale.text('Herd health', 'Sanidad del hato')
      : this.locale.text('Reproduction', 'Reproducción');
  }

  statusLabel(status: HerdAdvisory['status']): string {
    switch (status) {
      case 'pending': return this.locale.text('Pending', 'Pendiente');
      case 'active': return this.locale.text('Active', 'Activa');
      case 'revoked': return this.locale.text('Revoked', 'Revocada');
      case 'rejected': return this.locale.text('Declined', 'Rechazada');
      case 'expired': return this.locale.text('Expired', 'Vencida');
    }
  }

  statusTone(status: HerdAdvisory['status']): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      case 'revoked':
      case 'expired': return 'neutral';
    }
  }

  changeAdvisory(id: string, action: AdvisoryAction): void {
    if (!this.facade.canManage()) return;
    this.actionResult.set(this.facade.changeAdvisory(id, action));
  }

  actionMessage(result: AdvisoryResult): string {
    switch (result) {
      case 'updated': return this.locale.text(
        'Advisory access was updated for this herd.', 'Se actualizó el acceso de asesoría para este hato.',
      );
      case 'forbidden': return this.locale.text(
        'Only the herd administrator can change advisory access.', 'Solo el administrador del hato puede cambiar el acceso de asesoría.',
      );
      case 'invalid-transition': return this.locale.text(
        'This request has already changed and cannot use that action.', 'Esta solicitud ya cambió y no admite esa acción.',
      );
      case 'missing': return this.locale.text(
        'This advisory record is no longer available.', 'Este registro de asesoría ya no está disponible.',
      );
    }
  }
}
