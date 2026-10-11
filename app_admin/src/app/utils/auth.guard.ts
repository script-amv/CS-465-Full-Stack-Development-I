import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthenticationService);
  return auth.isAdmin() || inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
