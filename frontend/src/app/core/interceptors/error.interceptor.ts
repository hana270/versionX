import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip error handling for 3D model requests to avoid logging CORS errors
    if (request.url.includes('cdn.jsdelivr.net') || request.url.includes('raw.githubusercontent.com')) {
      return next.handle(request);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('HTTP Error:', error);
        // Customize error handling for API requests
        if (request.url.includes('/api/')) {
          let errorMessage = 'Une erreur est survenue';
          if (error.status === 0) {
            errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
          } else if (error.status === 400) {
            errorMessage = error.error?.message || 'Requête invalide';
          } else if (error.status === 401) {
            errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          } else if (error.status === 403) {
            errorMessage = 'Accès interdit.';
          }
          return throwError(() => new Error(errorMessage));
        }
        return throwError(() => error);
      })
    );
  }
}