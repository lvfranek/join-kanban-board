import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { AuthApiService } from '../../../core/services/auth-api.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private static readonly GREETING_BREAKPOINT = 1180;
  private static readonly INTRO_HOLD_MS = 800;
  private static readonly INTRO_SLIDE_DURATION_MS = 820;
  private static readonly INTRO_FADE_BUFFER_MS = 260;

  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private introStartTimeoutId: number | null = null;
  private introTimeoutId: number | null = null;

  private readonly brandLogo = viewChild<ElementRef<HTMLImageElement>>('brandLogo');
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal('');
  protected readonly submitSuccess = signal('');
  protected readonly showIntroOverlay = signal(true);
  protected readonly introAnimationActive = signal(false);
  protected readonly introShiftX = signal(0);
  protected readonly introShiftY = signal(0);
  protected readonly introLogoWidth = signal(100);
  protected readonly loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  constructor() {
    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.submitSuccess.set('You signed up successfully. Please log in.');

      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { registered: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    afterNextRender(() => {
      this.startIntroAnimation();
    });
  }

  protected finishIntroAnimation(): void {
    if (!this.showIntroOverlay()) {
      return;
    }

    if (this.introStartTimeoutId !== null) {
      window.clearTimeout(this.introStartTimeoutId);
      this.introStartTimeoutId = null;
    }

    if (this.introTimeoutId !== null) {
      window.clearTimeout(this.introTimeoutId);
      this.introTimeoutId = null;
    }

    this.showIntroOverlay.set(false);
    this.introAnimationActive.set(false);
  }

  protected hasError(controlName: 'email' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];

    return control.invalid && (control.dirty || control.touched);
  }

  protected async submitLogin(): Promise<void> {
    if (this.loginForm.invalid || this.isSubmitting()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set('');
    this.submitSuccess.set('');

    const { email, password } = this.loginForm.getRawValue();

    try {
      const response = await this.authApi.login(email, password);

      this.auth.setToken(response.token);
      this.auth.setAuthenticated(true);
      this.auth.setCurrentUser({
        id: String(response.user_id),
        email: response.email,
        name: response.full_name,
        phone: '',
      });

      await this.router.navigateByUrl(this.resolvePostLoginRoute());
    } catch {
      this.submitError.set('Check your email and password. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected continueAsGuest(): void {
    this.auth.loginAsGuest();
    this.auth.setGuestAuthenticated();
    void this.router.navigateByUrl(this.resolvePostLoginRoute());
  }

  private startIntroAnimation(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.showIntroOverlay.set(false);
      return;
    }

    const brandLogo = this.brandLogo()?.nativeElement;
    if (!brandLogo) {
      this.showIntroOverlay.set(false);
      return;
    }

    this.updateIntroTargetMetrics(brandLogo);

    this.introStartTimeoutId = window.setTimeout(() => {
      this.updateIntroTargetMetrics(brandLogo);
      this.introAnimationActive.set(true);
      this.introStartTimeoutId = null;
    }, Login.INTRO_HOLD_MS);

    this.introTimeoutId = window.setTimeout(
      () => {
        this.finishIntroAnimation();
      },
      Login.INTRO_HOLD_MS + Login.INTRO_SLIDE_DURATION_MS + Login.INTRO_FADE_BUFFER_MS,
    );
  }

  private updateIntroTargetMetrics(brandLogo: HTMLImageElement): void {
    const rect = brandLogo.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    this.introLogoWidth.set(rect.width);
    this.introShiftX.set(rect.left + rect.width / 2 - viewportCenterX);
    this.introShiftY.set(rect.top + rect.height / 2 - viewportCenterY);
  }

  private resolvePostLoginRoute(): string {
    return window.innerWidth <= Login.GREETING_BREAKPOINT ? '/greeting' : '/summary';
  }
}
