import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DemoSessionService } from '../../../core/config/demo-session.service';
import { LocaleService } from '../../../core/config/locale.service';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { SubscriptionFacade } from '../application/subscription.facade';
import { isPlanId, type DemoActivationResult, type PlanId } from '../domain/subscription.model';

@Component({
  selector: 'ichu-checkout-page', standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, RouterLink],
  templateUrl: './checkout-page.html', styleUrl: './checkout-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPage {
  readonly locale = inject(LocaleService);
  readonly workspace = inject(WorkspaceService);
  readonly session = inject(DemoSessionService);
  readonly facade = inject(SubscriptionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly selectedPlanId = computed<PlanId>(() => {
    const requested = this.queryParams().get('plan');
    return isPlanId(requested) ? requested : this.facade.preferredPlanId();
  });
  readonly selectedPlan = computed(() => this.facade.plan(this.selectedPlanId()));
  readonly form = new FormGroup({
    headCount: new FormControl<number | null>(200, {
      validators: [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)],
    }),
    termsAccepted: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
  });
  readonly headCount = toSignal(this.form.controls.headCount.valueChanges, {
    initialValue: this.form.controls.headCount.value,
  });
  readonly activation = signal<DemoActivationResult | null>(null);
  readonly estimate = computed(() => {
    const plan = this.selectedPlan();
    const count = this.headCount();
    return plan && count !== null && this.form.controls.headCount.valid
      ? this.facade.estimate(plan.id, count)
      : null;
  });

  constructor() {
    effect(() => {
      const heads = Number(this.queryParams().get('heads'));
      if (Number.isSafeInteger(heads) && heads > 0 && heads !== this.form.controls.headCount.value) {
        this.form.controls.headCount.setValue(heads);
      }
    });
  }

  planName(id: PlanId): string {
    switch (id) {
      case 'basic': return this.locale.text('Basic', 'Básico');
      case 'ganadero': return this.locale.text('Rancher', 'Ganadero');
      case 'establishment': return this.locale.text('Establishment', 'Establecimiento');
    }
  }

  rateLabel(value: number): string {
    return `S/ ${this.locale.number(value, { maximumFractionDigits: 2 })}`;
  }

  headLimitLabel(): string {
    const limit = this.selectedPlan()?.headLimit;
    return limit === null || limit === undefined
      ? this.locale.text('Unlimited heads', 'Cabezas ilimitadas')
      : this.locale.text(`Up to ${this.locale.number(limit)} heads`, `Hasta ${this.locale.number(limit)} cabezas`);
  }

  deviceLimitLabel(): string {
    return this.locale.text(
      'Device quota to be confirmed for your herd size.',
      'Cuota de dispositivos por confirmar según el tamaño del hato.',
    );
  }

  canActivate(): boolean {
    return this.form.controls.termsAccepted.value
      && this.form.controls.headCount.valid
      && this.estimate()?.withinHeadLimit === true;
  }

  clearActivation(): void {
    this.activation.set(null);
  }

  simulateActivation(): void {
    this.form.markAllAsTouched();
    if (!this.canActivate()) return;
    const count = this.form.controls.headCount.value;
    const plan = this.selectedPlan();
    if (count === null || !plan) return;
    this.activation.set(this.facade.simulateActivation(plan.id, count));
  }

  activationMessage(result: DemoActivationResult): string {
    switch (result.kind) {
      case 'activated': return this.locale.text(
        'Selection saved for this session. No payment was processed and no plan entitlements changed.',
        'Selección de prueba guardada en memoria. No se procesó ningún pago ni cambiaron las prestaciones del plan.',
      );
      case 'invalid-plan': return this.locale.text(
        'Choose a plan from the comparison page.', 'Elige un plan desde la página de comparación.',
      );
      case 'invalid-head-count': return this.locale.text(
        'Enter a positive whole number of heads.', 'Ingresa un número entero positivo de cabezas.',
      );
      case 'capacity-exceeded': return this.locale.text(
        'This plan does not cover the entered herd size. Choose the next plan in the comparison.',
        'Este plan no cubre el tamaño de hato indicado. Elige el siguiente plan en la comparación.',
      );
    }
  }
}
