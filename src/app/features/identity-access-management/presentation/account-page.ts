import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { LocaleService } from '../../../core/config/locale.service';
import { WorkspaceService } from '../../../core/config/workspace.service';
import { IdentityFacade } from '../application/identity.facade';
import { IDENTITY_REPOSITORY_PROVIDER } from '../infrastructure/mock-identity.adapter';

@Component({
  selector: 'ichu-account-page', standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, RouterLink],
  providers: [IdentityFacade, IDENTITY_REPOSITORY_PROVIDER],
  templateUrl: './account-page.html', styleUrl: './identity-ui.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  readonly locale = inject(LocaleService);
  readonly workspace = inject(WorkspaceService);
  readonly facade = inject(IdentityFacade);
  readonly status = signal<'idle' | 'saved' | 'invalid' | 'duplicate-license'>('idle');
  readonly discardedDraft = signal(false);
  private lastContext: string | null = null;
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [
      Validators.required, Validators.minLength(2), Validators.maxLength(80),
      Validators.pattern(/^(?=.{2,80}$)\S(?:.*\S)?$/),
    ] }),
    email: new FormControl('', { nonNullable: true, validators: [
      Validators.required, Validators.email, Validators.maxLength(120),
    ] }),
    region: new FormControl('', { nonNullable: true, validators: [
      Validators.required, Validators.pattern(/^(Junín|Puno|Cusco|other)$/),
    ] }),
    specialty: new FormControl('', { nonNullable: true }),
    license: new FormControl('', { nonNullable: true }),
    experience: new FormControl(0, { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const context = this.facade.contextKey();
      untracked(() => {
        this.discardedDraft.set(this.lastContext !== null && this.lastContext !== context && this.form.dirty);
        this.lastContext = context;
        const veterinarian = this.workspace.role() === 'veterinarian';
        this.form.controls.specialty.setValidators(veterinarian
          ? [Validators.required, Validators.pattern(/^(herd-health|reproduction|nutrition|other)$/)] : []);
        this.form.controls.license.setValidators(veterinarian
          ? [Validators.required, Validators.pattern(/^CMVP-\d{4,6}$/)] : []);
        this.form.controls.experience.setValidators(veterinarian
          ? [Validators.required, Validators.min(0), Validators.max(60), Validators.pattern(/^\d+$/)] : []);
        this.form.reset(this.facade.profile());
        this.status.set('idle');
      });
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.status.set('invalid');
      return;
    }
    const result = this.facade.saveProfile(this.form.getRawValue());
    this.status.set(result);
    if (result === 'saved') {
      this.form.reset(this.facade.profile());
      this.discardedDraft.set(false);
    }
  }

  reset(): void {
    this.form.reset(this.facade.profile());
    this.status.set('idle');
    this.discardedDraft.set(false);
  }
}
