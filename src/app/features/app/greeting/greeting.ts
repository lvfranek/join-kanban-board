import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { UserGreetingService } from '../../../core/services/user-greeting.service';

@Component({
  selector: 'app-greeting',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './greeting.html',
  styleUrl: './greeting.scss',
})
export class Greeting implements OnInit, OnDestroy {
  private static readonly SUMMARY_GREETING_BREAKPOINT = 1180;

  private readonly router = inject(Router);
  protected readonly greeting = inject(UserGreetingService);
  private readonly timers: number[] = [];

  protected readonly isLeaving = signal(false);

  async ngOnInit(): Promise<void> {
    if (!this.shouldShowGreeting()) {
      await this.router.navigateByUrl('/summary');
      return;
    }

    this.scheduleSummaryRedirect();
  }

  ngOnDestroy(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer));
  }

  private scheduleSummaryRedirect(): void {
    this.timers.push(
      window.setTimeout(() => {
        this.isLeaving.set(true);
      }, 2200),
    );

    this.timers.push(
      window.setTimeout(() => {
        void this.router.navigateByUrl('/summary');
      }, 3100),
    );
  }

  private shouldShowGreeting(): boolean {
    return window.innerWidth <= Greeting.SUMMARY_GREETING_BREAKPOINT;
  }
}
