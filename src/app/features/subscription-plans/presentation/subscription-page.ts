import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { LocaleService } from '../../../core/config/locale.service';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { SubscriptionFacade } from '../application/subscription.facade';
import type { PlanCoverageCode, PlanId } from '../domain/subscription.model';
import { Router } from '@angular/router';

@Component({
  selector: 'ichu-subscription-page', standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule],
  templateUrl: './subscription-page.html', styleUrl: './subscription-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionPage {
  readonly locale = inject(LocaleService);
  readonly workspace = inject(WorkspaceService);
  readonly facade = inject(SubscriptionFacade);
  private readonly router = inject(Router);
  readonly estimateForm = new FormGroup({
    headCount: new FormControl<number | null>(200, {
      validators: [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)],
    }),
  });
  readonly headCount = toSignal(this.estimateForm.controls.headCount.valueChanges, {
    initialValue: this.estimateForm.controls.headCount.value,
  });

  planName(id: PlanId): string {
    switch (id) {
      case 'basic': return this.locale.text('Basic', 'Básico');
      case 'ganadero': return this.locale.text('Rancher', 'Ganadero');
      case 'establishment': return this.locale.text('Establishment', 'Establecimiento');
    }
  }

  coverageLabel(code: PlanCoverageCode): string {
    const labels: Record<PlanCoverageCode, readonly [string, string]> = {
      'herd-and-lots': ['Live herd and lots', 'Hato y lotes'],
      'health-calendar': ['Health calendar', 'Calendario sanitario'],
      'single-user': ['1 user', '1 usuario'],
      'gps-geofences': ['GPS and geofences', 'GPS y geocercas'],
      'anti-theft': ['Anti-theft tracking', 'Seguimiento antiabigeato'],
      'nutrition-fattening': ['Nutrition and fattening', 'Nutrición y engorde'],
      'sms-push-alerts': ['SMS and push alerts', 'Alertas SMS y push'],
      'five-users-plus-vet': ['5 users + external veterinarian', '5 usuarios + veterinario externo'],
      'advanced-reports': ['Advanced Excel and PDF reports', 'Reportes avanzados en Excel y PDF'],
      'multi-farm': ['Multiple farms', 'Multi-predio'],
      'multi-lot': ['Multiple lots', 'Multi-lote'],
      'priority-support': ['Priority support', 'Soporte prioritario'],
      'ichu-collar': ['ICHU collar', 'Collar ICHU'],
      'offline-telemetry': ['Offline telemetry', 'Telemetría sin conexión'],
      'mobile-app': ['Mobile app', 'Aplicación móvil'],
    };
    const [english, spanish] = labels[code];
    return this.locale.text(english, spanish);
  }

  headLimitLabel(id: PlanId): string {
    const limit = this.facade.plan(id)?.headLimit;
    return limit === null || limit === undefined
      ? this.locale.text('Unlimited heads', 'Cabezas ilimitadas')
      : this.locale.text(`Up to ${this.locale.number(limit)} heads`, `Hasta ${this.locale.number(limit)} cabezas`);
  }

  deviceLimitLabel(): string {
    return this.locale.text(
      'Numeric device quota not specified; the report ties it to herd size.',
      'La cuota numérica de dispositivos no está especificada; el informe la vincula al tamaño del hato.',
    );
  }

  rateLabel(value: number): string {
    return `S/ ${this.locale.number(value, { maximumFractionDigits: 2 })}`;
  }

  estimate(planId: PlanId) {
    const headCount = this.headCount();
    return this.estimateForm.controls.headCount.valid && headCount !== null
      ? this.facade.estimate(planId, headCount)
      : null;
  }

  choosePlan(id: PlanId): void {
    const estimate = this.estimate(id);
    if (!estimate?.withinHeadLimit) return;
    void this.router.navigate(['/checkout'], {
      queryParams: { plan: id, heads: estimate.headCount },
    });
  }
}
