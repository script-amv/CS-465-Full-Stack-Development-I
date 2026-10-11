import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Customer } from '../models/customer';
import { ManagementService } from '../services/management.service';

@Component({
  selector: 'app-customer-management', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './customer-management.component.html',
})
export class CustomerManagementComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  customers: Customer[] = [];
  loading = false;
  busy = false;
  error = '';
  message = '';
  constructor(private readonly management: ManagementService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.error = '';
    this.management.getCustomers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: customers => { this.customers = customers; this.loading = false; },
      error: (error: HttpErrorResponse) => { this.loading = false; this.error = error.error?.message || 'Customers could not be loaded.'; },
    });
  }
  save(customer: Customer, form: NgForm): void {
    if (this.busy || form.invalid) return;
    this.busy = true; this.error = ''; this.message = '';
    this.management.updateCustomer(customer).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        this.customers = this.customers.map(item => item._id === updated._id ? updated : item);
        this.busy = false; this.message = 'Customer details saved.';
      },
      error: (error: HttpErrorResponse) => { this.busy = false; this.error = error.error?.message || 'The customer could not be saved.'; },
    });
  }
  remove(customer: Customer): void {
    if (this.busy || !window.confirm(`Delete ${customer.email}? Customers with reservation history cannot be deleted.`)) return;
    this.busy = true; this.error = ''; this.message = '';
    this.management.deleteCustomer(customer._id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.customers = this.customers.filter(item => item._id !== customer._id); this.busy = false; this.message = 'Customer deleted.'; },
      error: (error: HttpErrorResponse) => { this.busy = false; this.error = error.error?.message || 'The customer could not be deleted.'; },
    });
  }
}
