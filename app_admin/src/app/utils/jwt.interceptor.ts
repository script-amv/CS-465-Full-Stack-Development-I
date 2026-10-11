import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';
import { TripDataService } from '../services/trip-data.service';

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthenticationService);
  const router = inject(Router);
  const api = new URL(inject(TripDataService).baseUrl);
  const target = new URL(request.url, window.location.origin);
  const isTripAPI = target.origin === api.origin &&
    (target.pathname === `${api.pathname}/trips` || target.pathname.startsWith(`${api.pathname}/trips/`));
  const authenticated = isTripAPI && auth.isLoggedIn();
  const outbound = authenticated ? request.clone({ setHeaders: { Authorization: `Bearer ${auth.getToken()}` } }) : request;
  return next(outbound).pipe(catchError((error: HttpErrorResponse) => {
    if (isTripAPI && error.status === 401) {
      auth.logout();
      void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    }
    return throwError(() => error);
  }));
};
