import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ValidationErrorResponse } from '../models/user.model';

export const errorInterceptor: HttpInterceptorFn = (_request, next) => next(_request).pipe(
  catchError((error: HttpErrorResponse) => {
    const body = error.error as Partial<ValidationErrorResponse> | null;
    const safeError = {
      status: error.status,
      message: body?.message ?? 'Unable to process your request. Please try again later.',
      errors: body?.errors ?? {}
    };
    return throwError(() => safeError);
  })
);
