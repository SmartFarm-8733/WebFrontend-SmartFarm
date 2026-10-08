import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LocaleService } from '../../../core/config/locale.service';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { CattleFacade } from '../application/cattle.facade';
import { CattleRepository } from '../domain/cattle.repository';
import { validDate } from '../domain/cattle';
import type { ExitReason, LifeStage } from '../domain/cattle';
import { CattleMockRepository } from '../infrastructure/cattle.mock.repository';

type PendingChange = { readonly type: 'stage'; readonly id: string; readonly herdId: string; readonly stage: LifeStage; readonly at: string } |
  { readonly type: 'exit'; readonly id: string; readonly herdId: string; readonly reason: ExitReason; readonly at: string };

@Component({
  selector: 'ichu-cattle-detail-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, RouterLink],
  providers: [{ provide: CattleRepository, useExisting: CattleMockRepository }, CattleFacade],
  templateUrl: './cattle-detail.page.html',
  styleUrl: './cattle-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CattleDetailPage {
  readonly locale = inject(LocaleService);
  readonly workspace = inject(WorkspaceService);
  readonly facade = inject(CattleFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly animal = computed(() => this.facade.find(this.params().get('id') ?? ''));
  readonly today = this.workspace.now.slice(0, 10);
  readonly operation = signal<'stage' | 'exit' | null>(null);
  readonly pending = signal<PendingChange | null>(null);
  readonly saved = signal<'stage' | 'exit' | null>(null);
  readonly availableStages = computed(() => {
    const animal = this.animal();
    return animal ? this.facade.availableStages(animal.sex).filter(stage => stage !== animal.stage) : [];
  });
  readonly currentSince = computed(() => this.animal()?.stages.at(-1)?.from ?? this.today);
  readonly history = computed(() => [...(this.animal()?.stages ?? [])].reverse());
  readonly stageForm = this.fb.group({ stage: this.fb.control<LifeStage>('calf', Validators.required),
    at: [this.today, [Validators.required, control => this.validEventDate(String(control.value)) ? null : { date: true }]] });
  readonly exitForm = this.fb.group({ reason: this.fb.control<ExitReason>('sale', Validators.required),
    at: [this.today, [Validators.required, control => this.validEventDate(String(control.value)) ? null : { date: true }]] });

  constructor() {
    effect(() => {
      this.params(); this.workspace.herdId(); this.workspace.role();
      this.operation.set(null); this.pending.set(null); this.saved.set(null); this.facade.result.set(null);
    });
  }

  open(type: 'stage' | 'exit'): void {
    const animal = this.animal();
    if (!animal || animal.status === 'inactive' || !this.facade.writable()) return;
    this.stageForm.reset({ stage: this.availableStages()[0] ?? 'calf', at: this.today });
    this.exitForm.reset({ reason: 'sale', at: this.today });
    this.pending.set(null); this.saved.set(null); this.facade.result.set(null); this.operation.set(type);
  }

  review(): void {
    const animal = this.animal();
    if (!animal || !this.facade.writable() || animal.status !== 'active') return;
    const herdId = this.workspace.herdId();
    if (this.operation() === 'stage') {
      this.stageForm.markAllAsTouched();
      if (this.stageForm.valid) this.pending.set({ type: 'stage', id: animal.id, herdId, ...this.stageForm.getRawValue() });
    } else if (this.operation() === 'exit') {
      this.exitForm.markAllAsTouched();
      if (this.exitForm.valid) this.pending.set({ type: 'exit', id: animal.id, herdId, ...this.exitForm.getRawValue() });
    }
  }

  confirm(): void {
    const pending = this.pending();
    const animal = this.animal();
    if (!pending || !animal || pending.id !== animal.id || pending.herdId !== this.workspace.herdId() ||
      !this.facade.writable() || animal.status !== 'active') { this.cancel(); return; }
    const success = pending.type === 'stage' ? this.facade.changeStage(pending.id, pending.stage, pending.at) :
      this.facade.deactivate(pending.id, pending.reason, pending.at);
    if (success) { this.saved.set(pending.type); this.pending.set(null); this.operation.set(null); }
  }

  cancel(): void { this.operation.set(null); this.pending.set(null); this.facade.result.set(null); }
  edit(): void { this.pending.set(null); this.facade.result.set(null); }

  private validEventDate(value: string): boolean {
    return validDate(value, this.workspace.now) && value >= this.currentSince();
  }
}
