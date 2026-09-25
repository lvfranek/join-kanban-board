import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { AuthApiService } from '../../core/services/auth-api.service';
import { ContactService } from '../../core/services/contact.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { TaskService } from '../../core/services/task.service';
import { AppHeader } from '../../shared/components/app-header/app-header';
import { Sidebar } from '../../shared/components/sidebar/sidebar';

type SidebarMode = 'expanded' | 'collapsed' | 'hidden';

interface BottomNavItem {
  readonly label: string;
  readonly path: string;
  readonly iconPath: string;
}

@Component({
  selector: 'app-shell-layout',
  host: {
    '(window:resize)': 'onViewportResize()',
    '(document:click)': 'onUserActivity()',
    '(document:keydown)': 'onUserActivity()',
    '(document:touchstart)': 'onUserActivity()',
    '(document:mousemove)': 'onUserActivity()',
  },
  imports: [RouterOutlet, AppHeader, Sidebar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell-layout.html',
  styleUrl: './shell-layout.scss',
})
export class ShellLayout implements OnDestroy {
  private static readonly COMPACT_BREAKPOINT = 1024;
  private static readonly STORAGE_KEY = 'sidebar-mode';
  private static readonly INACTIVITY_RESET_MS = 30 * 60 * 1000;
  private static readonly INACTIVITY_WARNING_MS = 28 * 60 * 1000;

  protected readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
  private readonly supabase = inject(SupabaseService);
  private readonly contactService = inject(ContactService);
  private readonly taskService = inject(TaskService);
  private readonly viewportWidth = signal(window.innerWidth);
  private readonly sidebarMode = signal<SidebarMode>(ShellLayout.resolveInitialMode());
  private readonly currentUrl = signal(this.router.url);
  protected readonly isSessionWarningVisible = signal(false);
  private inactivityTimeoutId: number | null = null;
  private inactivityWarningTimeoutId: number | null = null;

  protected readonly isReady = signal(false);
  protected readonly isAuthResolved = signal(this.auth.isGuest());
  protected readonly isAuthenticated = this.auth.isAuthenticated;

  protected readonly bottomNavItems: readonly BottomNavItem[] = [
    { label: 'Summary', path: '/summary', iconPath: '/icons/Summary.svg' },
    { label: 'Add Task', path: '/add-task', iconPath: '/icons/Add task.svg' },
    { label: 'Board', path: '/board', iconPath: '/icons/Board.svg' },
    { label: 'Contacts', path: '/contacts', iconPath: '/icons/Contacts.svg' },
  ];

  constructor() {
    afterNextRender(() => this.isReady.set(true));

    void this.syncAuthState();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });

    let lastMode: 'none' | 'user' | 'guest' = 'none';
    effect(() => {
      const authed = this.auth.isAuthenticated();
      const guest = this.auth.isGuest();
      const mode: 'none' | 'user' | 'guest' = !authed ? 'none' : guest ? 'guest' : 'user';

      if (mode === lastMode) return;
      lastMode = mode;

      this.contactService.invalidate();
      this.taskService.invalidate();
      if (mode !== 'none') {
        void this.contactService.list();
        void this.taskService.list();
        this.resetInactivityTimer();
      } else {
        this.clearInactivityTimer();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearInactivityTimer();
    this.clearInactivityWarningTimer();
  }

  protected isBottomNavActive(path: string): boolean {
    if (path === '/summary' && this.currentUrl().startsWith('/greeting')) {
      return true;
    }

    return this.currentUrl().startsWith(path);
  }

  protected readonly isFlushRoute = computed(() => this.currentUrl().startsWith('/contacts'));
  protected isSummaryView(): boolean {
    return this.currentUrl().startsWith('/summary');
  }

  protected isContactsView(): boolean {
    return this.currentUrl().startsWith('/contacts');
  }

  protected isBoardView(): boolean {
    return this.currentUrl().startsWith('/board');
  }

  protected isPublicTextView(): boolean {
    const url = this.currentUrl();

    return (
      url.startsWith('/help-site') ||
      url.startsWith('/legal-notice') ||
      url.startsWith('/privacy-policy')
    );
  }

  private async syncAuthState(): Promise<void> {
    if (!this.auth.currentUser()) {
      await this.authApi.restoreSession();
    }

    this.isAuthResolved.set(true);
  }


  private static resolveInitialMode(): SidebarMode {
    if (window.innerWidth <= ShellLayout.COMPACT_BREAKPOINT) return 'hidden';
    const stored = localStorage.getItem(ShellLayout.STORAGE_KEY);
    if (stored === 'collapsed' || stored === 'expanded') return stored;
    return 'expanded';
  }

  private persistMode(mode: SidebarMode): void {
    if (mode !== 'hidden') {
      localStorage.setItem(ShellLayout.STORAGE_KEY, mode);
    }
  }

  protected readonly isCompact = computed(
    () => this.viewportWidth() <= ShellLayout.COMPACT_BREAKPOINT,
  );
  protected readonly isSidebarHidden = computed(() => this.sidebarMode() === 'hidden');
  protected readonly isSidebarCollapsed = computed(() => this.sidebarMode() === 'collapsed');
  protected readonly isSidebarExpanded = computed(() => this.sidebarMode() === 'expanded');

  protected toggleSidebar(): void {
    if (this.isCompact()) {
      this.sidebarMode.set(this.isSidebarHidden() ? 'collapsed' : 'hidden');
      return;
    }

    const next = this.isSidebarExpanded() ? 'collapsed' : 'expanded';
    this.sidebarMode.set(next);
    this.persistMode(next);
  }

  protected closeSidebar(): void {
    if (this.isCompact()) {
      this.sidebarMode.set('hidden');
    }
  }

  protected onViewportResize(): void {
    const width = window.innerWidth;
    const wasCompact = this.isCompact();

    this.viewportWidth.set(width);

    if (wasCompact && !this.isCompact()) {
      const stored = localStorage.getItem(ShellLayout.STORAGE_KEY);
      const mode: SidebarMode = stored === 'collapsed' ? 'collapsed' : 'expanded';
      this.sidebarMode.set(mode);
    }

    if (!wasCompact && this.isCompact()) {
      this.sidebarMode.set('hidden');
    }
  }

  protected onUserActivity(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    this.isSessionWarningVisible.set(false);
    this.resetInactivityTimer();
  }

  protected continueSession(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    this.isSessionWarningVisible.set(false);
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    this.clearInactivityTimer();
    this.clearInactivityWarningTimer();

    this.inactivityWarningTimeoutId = window.setTimeout(() => {
      this.isSessionWarningVisible.set(true);
    }, ShellLayout.INACTIVITY_WARNING_MS);

    this.inactivityTimeoutId = window.setTimeout(() => {
      void this.resetSessionAfterTimeout();
    }, ShellLayout.INACTIVITY_RESET_MS);
  }

  private clearInactivityTimer(): void {
    if (this.inactivityTimeoutId !== null) {
      window.clearTimeout(this.inactivityTimeoutId);
      this.inactivityTimeoutId = null;
    }
  }

  private clearInactivityWarningTimer(): void {
    if (this.inactivityWarningTimeoutId !== null) {
      window.clearTimeout(this.inactivityWarningTimeoutId);
      this.inactivityWarningTimeoutId = null;
    }
  }

  private async resetSessionAfterTimeout(): Promise<void> {
    this.clearInactivityTimer();
    this.clearInactivityWarningTimer();
    this.isSessionWarningVisible.set(false);

    if (!this.auth.isAuthenticated()) {
      return;
    }

    if (!this.auth.isGuest()) {
      await this.supabase.client.auth.signOut();
    }

    this.auth.logout();
    this.contactService.invalidate();
    this.taskService.invalidate();
    await this.router.navigate(['/login']);
  }
}
