import { Component, ElementRef, HostListener, ViewChild, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthApiService } from '../../../core/services/auth-api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
})
export class AppHeader {
  @ViewChild('profileButton') private profileButton?: ElementRef<HTMLButtonElement>;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);

  protected readonly isAuthenticated = this.authService.isAuthenticated;
  private readonly displayName = computed(() => this.authService.currentUser()?.name ?? '');

  protected readonly initials = computed(() => {
    const name = this.displayName().trim();
    if (!name) return 'G';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + second).toUpperCase() || 'G';
  });

  isProfileMenuOpen = false;

  @HostListener('document:click')
  closeProfileMenu(): void {
    this.focusProfileButtonIfMenuHadFocus();
    this.isProfileMenuOpen = false;
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  keepProfileMenuOpen(event: MouseEvent): void {
    event.stopPropagation();
  }

  async logout(): Promise<void> {
    // Central logout: deletes the token in Django, clears guest flag, token, current user,
    // and notifies listeners (TaskService, ContactService) to invalidate their caches.
    await this.authApi.logout();
    this.focusProfileButtonIfMenuHadFocus();
    this.isProfileMenuOpen = false;
    await this.router.navigate(['/login']);
  }

  private focusProfileButtonIfMenuHadFocus(): void {
    const activeElement = document.activeElement;

    if (activeElement?.classList.contains('app-header__profile-menu-item')) {
      this.profileButton?.nativeElement.focus();
    }
  }
}
