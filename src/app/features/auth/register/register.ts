import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';

import { AuthApiService } from '../../../core/services/auth-api.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, TuiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);

  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal('');
  protected readonly submitSuccess = signal('');

  protected readonly registerForm = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    acceptPrivacy: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });

  protected readonly passwordsMismatch = computed(() => {
    const password = this.registerForm.controls.password.value;
    const confirmPassword = this.registerForm.controls.confirmPassword.value;
    const confirmTouched = this.registerForm.controls.confirmPassword.touched;

    return !!confirmTouched && password !== confirmPassword;
  });

  protected hasError(controlName: keyof Register['registerForm']['controls']): boolean {
    const control = this.registerForm.controls[controlName];

    return control.invalid && (control.dirty || control.touched);
  }

  protected async submitRegister(): Promise<void> {
    if (this.registerForm.invalid || this.passwordsMismatch() || this.isSubmitting()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set('');
    this.submitSuccess.set('');

    const { fullName, email, password, confirmPassword } = this.registerForm.getRawValue();

    try {
      await this.authApi.register(fullName, email, password, confirmPassword);
      await this.router.navigate(['/login'], {
        queryParams: { registered: '1' },
      });
    } catch (err) {
      this.submitError.set(this.readErrorMessage(err));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private readErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 400) {
      const errors = err.error as Record<string, string[] | string>;
      const first = Object.values(errors)[0];
      if (Array.isArray(first) && first.length) return first[0];
      if (typeof first === 'string') return first;
    }
    return 'Sign up failed. Please try again.';
  }
}
