import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthenticationService } from '../services/authentication.service';

@Component({
  selector: 'app-login', standalone: true, imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly destroyRef = inject(DestroyRef);
  credentials = { email: '', password: '' };
  formError = '';
  submitted = false;
  constructor(private readonly auth: AuthenticationService, private readonly router: Router, private readonly route: ActivatedRoute) {}

  onLoginSubmit(form: NgForm): void {
    if (this.submitted) return;
    this.formError = '';
    if (form.invalid) {
      this.formError = 'Enter a valid email and password.';
      return;
    }
    this.submitted = true;
    this.auth.login({ email: this.credentials.email.trim(), name: '' }, this.credentials.password)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.credentials.password = '';
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        void this.router.navigateByUrl(/^\/(add|edit\/[A-Za-z]{2}\d{3})(\?.*)?$/.test(returnUrl) ? returnUrl : '/');
      },
      error: (error: HttpErrorResponse) => {
        this.submitted = false;
        this.credentials.password = '';
        this.formError = error.error?.message || 'Login could not be completed. Check that the Express server is running.';
      },
    });
  }
}
