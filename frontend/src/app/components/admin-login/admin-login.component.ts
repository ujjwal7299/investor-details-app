import { Component, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss']
})
export class AdminLoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  readonly loggedIn = output<void>();
  readonly back = output<void>();
  readonly loginForm = this.formBuilder.nonNullable.group({ userId: ['', Validators.required], password: ['', Validators.required] });
  errorMessage = '';
  isSubmitting = false;

  submit(): void {
    this.errorMessage = '';
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.isSubmitting = true;
    const { userId, password } = this.loginForm.getRawValue();
    this.adminService.login(userId, password).subscribe({
      next: (response) => { this.adminService.setToken(response.data.token); this.isSubmitting = false; this.loggedIn.emit(); },
      error: (error: { message?: string }) => { this.errorMessage = error.message ?? 'Unable to sign in.'; this.isSubmitting = false; }
    });
  }
}
