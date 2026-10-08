import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { DemoSessionService } from '../../../core/config/demo-session.service';
import { LocaleService } from '../../../core/config/locale.service';
import { IdentityFacade } from '../application/identity.facade';
import { type DemoRole } from '../domain/identity.repository';
import { IDENTITY_REPOSITORY_PROVIDER } from '../infrastructure/mock-identity.adapter';

@Component({
  selector: 'ichu-login-page', standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, RouterLink],
  templateUrl: './login-page.html', styleUrl: './auth.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  readonly locale = inject(LocaleService);
  private readonly session = inject(DemoSessionService);
  private readonly router = inject(Router);
  readonly role = new FormControl<DemoRole>('rancher', { nonNullable: true });
  readonly credentials = new FormGroup({
    email: new FormControl('', {
      nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(120)],
    }),
    password: new FormControl('', {
      nonNullable: true, validators: [Validators.required, Validators.minLength(8), Validators.maxLength(128)],
    }),
  });
  readonly attempted = signal(false);
  readonly entering = signal(false);
  readonly navigationFailed = signal(false);

  async exploreDemo(): Promise<void> {
    if (this.entering()) return;
    this.entering.set(true);
    this.navigationFailed.set(false);
    this.credentials.controls.password.reset('');
    this.session.enter(this.role.value);
    try {
      this.navigationFailed.set(!await this.router.navigateByUrl('/dashboard'));
    } catch {
      this.navigationFailed.set(true);
    } finally {
      this.entering.set(false);
    }
  }

  async checkDemoForm(): Promise<void> {
    this.attempted.set(true);
    this.credentials.markAllAsTouched();
    if (this.credentials.invalid) return;
    await this.exploreDemo();
  }
}

@Component({
  selector: 'ichu-register-page', standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, RouterLink],
  providers: [IdentityFacade, IDENTITY_REPOSITORY_PROVIDER],
  templateUrl: './register-page.html', styleUrl: './auth.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  readonly locale = inject(LocaleService);
  private readonly session = inject(DemoSessionService);
  private readonly router = inject(Router);
  private readonly facade = inject(IdentityFacade);
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
    role: new FormControl<DemoRole>('rancher', { nonNullable: true, validators: Validators.required }),
    terms: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
  });
  readonly reviewing = signal(false);
  readonly entering = signal(false);
  readonly navigationFailed = signal(false);

  review(): void {
    this.form.markAllAsTouched();
    if (this.form.valid) this.reviewing.set(true);
  }

  async confirm(): Promise<void> {
    if (this.form.invalid || !this.reviewing() || this.entering()) return;
    this.entering.set(true);
    this.navigationFailed.set(false);
    const values = this.form.getRawValue();
    this.session.enter(values.role, values.name.trim());
    const seeded = this.facade.profile();
    this.facade.saveProfile({
      name: values.name.trim(), email: values.email.trim(), region: values.region,
      specialty: seeded.specialty, license: seeded.license, experience: seeded.experience,
    });
    try {
      this.navigationFailed.set(!await this.router.navigateByUrl('/plans'));
    } catch {
      this.navigationFailed.set(true);
    } finally {
      this.entering.set(false);
    }
  }
}

@Component({
  selector: 'ichu-recovery-page', standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, RouterLink],
  templateUrl: './recovery-page.html', styleUrl: './auth.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryPage {
  readonly locale = inject(LocaleService);
  readonly email = new FormControl('', { nonNullable: true, validators: [
    Validators.required, Validators.email, Validators.maxLength(120),
  ] });
  readonly instructionsVisible = signal(false);

  showInstructions(): void {
    this.email.markAsTouched();
    if (this.email.valid) this.instructionsVisible.set(true);
  }
}

