import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LocaleService } from '../../../core/config/locale.service';
import { OperationsFacade } from '../application/operations.facade';
import { OPERATIONS_PROVIDERS } from '../application/operations.providers';
import { Freshness, NutritionLot } from '../domain/operations.models';

type MonitoringView = 'monitoring' | 'locations' | 'nutrition';

@Component({
  selector: 'ichu-monitoring-page', standalone: true, imports: [ReactiveFormsModule, MatButtonModule],
  providers: OPERATIONS_PROVIDERS, templateUrl: './monitoring.page.html', styleUrl: './monitoring.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonitoringPage {
  readonly locale = inject(LocaleService);
  readonly facade = inject(OperationsFacade);
  readonly view = toSignal(inject(ActivatedRoute).data.pipe(map((data): MonitoringView => data['view'] === 'locations' || data['view'] === 'nutrition' ? data['view'] : 'monitoring')), { initialValue: 'monitoring' });
  readonly filters = new FormGroup({ animal: new FormControl('', { nonNullable: true }), freshness: new FormControl<Freshness | ''>('', { nonNullable: true }), lot: new FormControl('', { nonNullable: true }) });
  private readonly values = toSignal(this.filters.valueChanges, { initialValue: this.filters.getRawValue() });
  readonly readings = computed(() => this.facade.animals().filter((animal) => (!this.values().animal || animal.id === this.values().animal) && (!this.values().freshness || this.facade.freshness(animal) === this.values().freshness)));
  readonly lots = computed(() => this.facade.lots().filter((lot) => !this.values().lot || lot.id === this.values().lot));
  readonly outsideCount = computed(() => this.facade.animals().filter((animal) => animal.position?.outside).length);
  readonly title = computed(() => this.locale.text(...({ monitoring: ['Biometric monitoring', 'Monitoreo biométrico'], locations: ['Locations & fences', 'Ubicaciones y cercos'], nutrition: ['Nutrition & finishing', 'Nutrición y engorde'] } satisfies Record<MonitoringView, [string, string]>)[this.view()]));

  constructor() {
    this.filters.controls.animal.valueChanges.pipe(takeUntilDestroyed()).subscribe((animal) => this.facade.animal.set(animal));
    effect(() => {
      this.facade.workspace.herdId(); this.facade.workspace.role(); this.view();
      untracked(() => this.filters.reset({ animal: '', freshness: '', lot: '' }));
    });
  }

  clearFilters(): void { this.filters.reset({ animal: '', freshness: '', lot: '' }); }
  lotFreshness(lot: NutritionLot): string { return !lot.capturedAt ? this.locale.text('No data', 'Sin datos') : Date.parse(this.facade.workspace.now) - Date.parse(lot.capturedAt) > 30 * 60_000 ? this.locale.text('Stale sample', 'Muestra antigua') : this.locale.text('Recent sample', 'Muestra reciente'); }
  heaterLabel(lot: NutritionLot): string { return lot.heater === 'unknown' ? this.locale.text('Unknown', 'Desconocido') : lot.heater === 'off' ? this.locale.text('Reported off', 'Reportado apagado') : this.locale.text('Reported on', 'Reportado encendido'); }
}

export { MonitoringPage as LocationsPage, MonitoringPage as NutritionPage };
