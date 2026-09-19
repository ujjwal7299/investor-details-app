import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { UserResponse } from '../../models/user.model';

function nameValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return value && /^[\p{L}][\p{L} .'-]*$/u.test(value) ? null : { nameFormat: true };
}

function mobileValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').replace(/[\s-]/g, '');
  return /^(?:\+91)?[6-9]\d{9}$/.test(value) ? null : { mobileFormat: true };
}

function aadhaarValidator(control: AbstractControl): ValidationErrors | null {
  return /^\d{12}$/.test(String(control.value ?? '').replace(/\s/g, '')) ? null : { aadhaarFormat: true };
}

function panValidator(control: AbstractControl): ValidationErrors | null {
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(String(control.value ?? '').toUpperCase()) ? null : { panFormat: true };
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.scss']
})
export class UserFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly userService = inject(UserService);
  readonly userForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), nameValidator]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    mobile: ['', [Validators.required, mobileValidator]],
    address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    aadhaarNumber: ['', [Validators.required, aadhaarValidator]],
    panNumber: ['', [Validators.required, panValidator]]
  });

  isSubmitting = false;
  errorMessage = '';
  success: UserResponse['data'] | null = null;

  submit(): void {
    this.errorMessage = '';
    this.success = null;
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    const value = this.userForm.getRawValue();
    this.userService.submit({ ...value, name: value.name.trim(), email: value.email.trim().toLowerCase(), mobile: this.normalizeMobile(value.mobile), address: value.address.trim(), aadhaarNumber: value.aadhaarNumber.replace(/\s/g, ''), panNumber: value.panNumber.trim().toUpperCase() }).subscribe({
      next: (response) => { this.success = response.data; this.userForm.reset(); this.isSubmitting = false; },
      error: (error: { message?: string }) => { this.errorMessage = error.message ?? 'Unable to process your request. Please try again later.'; this.isSubmitting = false; }
    });
  }

  hasError(field: string, error: string): boolean {
    const control = this.userForm.get(field);
    return !!control && control.touched && control.hasError(error);
  }

  private normalizeMobile(value: string): string {
    const digits = value.replace(/[\s-]/g, '');
    return digits.startsWith('+91') ? digits.slice(3) : digits;
  }
}
