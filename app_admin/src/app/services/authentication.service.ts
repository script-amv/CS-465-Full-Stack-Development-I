import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { BROWSER_STORAGE } from '../storage';
import { User } from '../models/user';
import { AuthResponse } from '../models/auth-response';
import { TripDataService } from './trip-data.service';

interface TokenPayload extends User { exp: number; }

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private timer?: ReturnType<typeof setTimeout>;
  private timedToken = '';
  private redirecting = false;

  constructor(
    @Inject(BROWSER_STORAGE) private readonly storage: Storage,
    private readonly tripData: TripDataService,
    private readonly router: Router,
  ) {}

  getToken(): string { return this.storage.getItem('travlr-token') || ''; }

  saveToken(token: string): void {
    this.storage.setItem('travlr-token', token);
    this.isLoggedIn();
  }

  logout(): void {
    this.storage.removeItem('travlr-token');
    clearTimeout(this.timer);
    this.timedToken = '';
  }

  private expireSession(): void {
    this.logout();
    if (!this.redirecting && !this.router.url.startsWith('/login')) {
      this.redirecting = true;
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } })
        .finally(() => { this.redirecting = false; });
    }
  }

  private payload(): TokenPayload | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts.every(Boolean)) throw new Error('Invalid token');
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
      const value: TokenPayload = JSON.parse(new TextDecoder().decode(bytes));
      if (!Number.isFinite(value.exp) || value.exp <= Date.now() / 1000 || typeof value.email !== 'string' || typeof value.name !== 'string') throw new Error('Expired or invalid token');
      return value;
    } catch {
      this.expireSession();
      return null;
    }
  }

  isLoggedIn(): boolean {
    const payload = this.payload();
    if (!payload) return false;
    const token = this.getToken();
    if (token !== this.timedToken) {
      clearTimeout(this.timer);
      this.timedToken = token;
      this.timer = setTimeout(() => {
        this.expireSession();
      }, Math.min(payload.exp * 1000 - Date.now(), 2147483647));
    }
    return true;
  }

  getCurrentUser(): User | null {
    const payload = this.payload();
    return payload ? { name: payload.name, email: payload.email, role: payload.role } : null;
  }

  isAdmin(): boolean { return this.isLoggedIn() && this.getCurrentUser()?.role === 'admin'; }

  login(user: User, password: string): Observable<AuthResponse> {
    return this.tripData.login(user, password).pipe(tap(response => this.saveToken(response.token)));
  }

  register(user: User, password: string): Observable<AuthResponse> {
    return this.tripData.register(user, password).pipe(tap(response => this.saveToken(response.token)));
  }
}
