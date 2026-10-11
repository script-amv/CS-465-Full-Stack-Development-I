import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Customer } from '../models/customer';
import { Reservation } from '../models/reservation';
import { TripDataService } from './trip-data.service';

@Injectable({ providedIn: 'root' })
export class ManagementService {
  constructor(private readonly http: HttpClient, private readonly trips: TripDataService) {}
  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.trips.baseUrl}/customers`);
  }
  updateCustomer(customer: Customer): Observable<Customer> {
    return this.http.put<Customer>(`${this.trips.baseUrl}/customers/${encodeURIComponent(customer._id)}`, {
      name: customer.name, email: customer.email, active: customer.active,
    });
  }
  deleteCustomer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.trips.baseUrl}/customers/${encodeURIComponent(id)}`);
  }
  getReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.trips.baseUrl}/reservations`);
  }
  updateReservation(id: string, status: Reservation['status']): Observable<Reservation> {
    return this.http.put<Reservation>(`${this.trips.baseUrl}/reservations/${encodeURIComponent(id)}`, { status });
  }
}
