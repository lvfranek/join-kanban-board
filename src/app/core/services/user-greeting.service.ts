import { Injectable, computed, inject } from '@angular/core';

import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UserGreetingService {
  private readonly auth = inject(AuthService);

  readonly userName = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return 'Guest';
    return this.asNonEmptyString(user.name) ?? this.extractNameFromEmail(user.email) ?? 'Guest';
  });
  readonly greetingText = computed(() => this.resolveGreetingText(new Date()));

  private resolveGreetingText(date: Date): string {
    const hour = date.getHours();

    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
  }

  private asNonEmptyString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private extractNameFromEmail(email: string | undefined): string | undefined {
    const [name] = email?.split('@') ?? [];
    if (!name) return undefined;

    return name
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
