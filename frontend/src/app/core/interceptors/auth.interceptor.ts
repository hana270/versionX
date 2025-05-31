import { Injectable, Injector } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../authentication/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private injector: Injector) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip adding Authorization header for 3D model requests and public endpoints
    if (
      request.url.includes('cdn.jsdelivr.net') ||
      request.url.includes('raw.githubusercontent.com') ||
      request.url.includes('/login') ||
      request.url.includes('/register') ||
      request.url.includes('/verify-email') ||
      request.url.includes('/resend-verification') ||
      request.url.includes('/request-reset-password') ||
      request.url.includes('/validate-code') ||
      request.url.includes('/reset-password')
    ) {
      return next.handle(request);
    }

    // Add Authorization header only for protected API endpoints
    const authService = this.injector.get(AuthService);
    const token = authService.getToken();
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          authService.logout();
        }
        return throwError(() => error);
      })
    );
  }
}