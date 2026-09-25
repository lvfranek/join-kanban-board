import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { AuthApiService } from '../services/auth-api.service';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const authApi = inject(AuthApiService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.parseUrl('/summary');
  }

  return authApi.restoreSession().then((loggedIn) => (loggedIn ? router.parseUrl('/summary') : true));
};
