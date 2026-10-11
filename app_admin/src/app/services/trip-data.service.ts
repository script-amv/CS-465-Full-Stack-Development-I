import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Trip } from '../models/trip';
import { User } from '../models/user';
import { AuthResponse } from '../models/auth-response';

@Injectable({ providedIn: 'root' })
export class TripDataService {
  readonly baseUrl = `http://${window.location.hostname}:3000/api`;
  private readonly tripsUrl = `${this.baseUrl}/trips`;

  constructor(private readonly http: HttpClient) {}

  login(user: User, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, { email: user.email, password });
  }

  register(user: User, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, { ...user, password });
  }

  getTrips(): Observable<Trip[]> {
    return this.http.get<Trip[]>(this.tripsUrl);
  }

  getTrip(code: string): Observable<Trip> {
    return this.http.get<Trip>(`${this.tripsUrl}/${encodeURIComponent(code)}`);
  }

  addTrip(trip: Trip): Observable<Trip> {
    return this.http.post<Trip>(this.tripsUrl, trip);
  }

  updateTrip(code: string, trip: Trip): Observable<Trip> {
    return this.http.put<Trip>(`${this.tripsUrl}/${encodeURIComponent(code)}`, trip);
  }

  deleteTrip(code: string): Observable<void> {
    return this.http.delete<void>(`${this.tripsUrl}/${encodeURIComponent(code)}`);
  }
}
