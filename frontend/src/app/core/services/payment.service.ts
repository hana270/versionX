import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry, tap, timeout } from 'rxjs/operators';
import { AuthStateService } from './auth-state.service';
import { ConfigServiceService } from './config-service.service';
import { PaymentRequest, PaymentResponse, CodeVerificationRequest, PaymentValidationResponse } from '../models/payment.model';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private authStateService: AuthStateService,
    private configService: ConfigServiceService
  ) {
    this.apiUrl = `${this.configService.apiUrl}/api/panier/payments`;
  }

  private getHeaders(): HttpHeaders {
    const token = this.authStateService.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.commandeId?.trim()) throw new Error('Commande ID is required');
    if (!request.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) throw new Error('Invalid email');
    if (!request.cardNumber || !/^\d{16}$/.test(request.cardNumber)) throw new Error('Card number must be 16 digits');
    if (!request.cardholderName?.trim()) throw new Error('Cardholder name is required');
    if (!request.expiryMonth || !/^(0?[1-9]|1[0-2])$/.test(request.expiryMonth)) throw new Error('Expiry month must be between 1 and 12');
    if (!request.expiryYear || !/^\d{2}$/.test(request.expiryYear)) throw new Error('Expiry year must be two digits (YY)');
    if (!request.cvv || !/^\d{3}$/.test(request.cvv)) throw new Error('CVV must be 3 digits');
  }

  private validateVerificationRequest(request: CodeVerificationRequest): void {
    if (!request.transactionId?.trim()) throw new Error('Transaction ID is required');
    if (!request.verificationCode || !/^\d{6}$/.test(request.verificationCode)) throw new Error('Verification code must be 6 digits');
  }

 private handleError(error: unknown): Observable<never> {
    console.error('PaymentService error:', error); // Debug logging
    
    let userMessage = 'An error occurred during payment operation';
    let technicalMessage = 'Unknown error';
    let errorCode = 'UNKNOWN_ERROR';
    let status = 0;
    let transactionId: string | undefined = undefined;

    // Vérification du type d'erreur
    if (error instanceof HttpErrorResponse) {
        status = error.status;
        technicalMessage = error.error?.message || error.message;
        
        if (status === 0) {
            userMessage = 'Network error: Could not connect to server';
            errorCode = 'NETWORK_ERROR';
        } else if (status === 400) {
            userMessage = 'Invalid payment data';
            errorCode = 'VALIDATION_ERROR';
            if (technicalMessage.includes('code de vérification incorrect')) {
                userMessage = 'Code de vérification incorrect';
                errorCode = 'INVALID_CODE';
            } else if (technicalMessage.includes('code a expiré')) {
                userMessage = 'Le code de vérification a expiré';
                errorCode = 'CODE_EXPIRED';
            } else if (technicalMessage.includes('tentatives de vérification atteint')) {
                userMessage = 'Nombre maximum de tentatives atteint';
                errorCode = 'MAX_ATTEMPTS';
            } else if (technicalMessage.includes('renvois de code atteint')) {
                userMessage = 'Nombre maximum de renvois de code atteint';
                errorCode = 'MAX_RESEND';
            }
        } else if (status === 403) {
            userMessage = 'Unauthorized action';
            errorCode = 'AUTHORIZATION_ERROR';
        } else if (status === 404) {
            userMessage = 'Resource not found';
            errorCode = 'NOT_FOUND';
        } else if (status === 500) {
            userMessage = 'Server error';
            errorCode = 'SERVER_ERROR';
        }
        
        transactionId = error.error?.transactionId;
    } else if (error instanceof Error) {
        technicalMessage = error.message;
        
        if (error.name === 'TimeoutError') {
            userMessage = 'Request timeout. Please try again.';
            errorCode = 'TIMEOUT_ERROR';
        }
    } else if (typeof error === 'string') {
        technicalMessage = error;
    }

    return throwError(() => ({
        userMessage,
        technicalMessage,
        errorCode,
        status,
        transactionId,
    }));
}

  initiatePayment(request: PaymentRequest): Observable<PaymentResponse> {
    try {
      this.validatePaymentRequest(request);
    } catch (err: any) {
      return throwError(() => ({
        userMessage: err.message,
        errorCode: 'VALIDATION_ERROR',
        status: 400,
      }));
    }

    const url = `${this.apiUrl}/initiate`;
    return this.http
      .post<PaymentResponse>(url, request, {
        headers: this.getHeaders(),
        observe: 'response',
        responseType: 'json',
      })
      .pipe(
        retry(1),
        timeout(15000),
        map((response: { headers: HttpHeaders; body: PaymentResponse | null }) => {
          if (response.headers.get('Content-Type')?.includes('application/json') && response.body) {
            return response.body;
          }
          throw new Error('Invalid response from server');
        }),
        catchError(this.handleError)
      );
  }

  verifyCode(request: CodeVerificationRequest): Observable<PaymentValidationResponse> {
    try {
      this.validateVerificationRequest(request);
    } catch (err: any) {
      return throwError(() => ({
        userMessage: err.message,
        errorCode: 'VALIDATION_ERROR',
        status: 400,
      }));
    }

    const url = `${this.apiUrl}/verify`;
    return this.http
      .post<PaymentValidationResponse>(url, request, {
        headers: this.getHeaders(),
        observe: 'response',
        responseType: 'json',
      })
      .pipe(
        retry(1),
        timeout(30000),
        map((response: { headers: HttpHeaders; body: PaymentValidationResponse | null }) => {
          if (response.headers.get('Content-Type')?.includes('application/json') && response.body) {
            return response.body;
          }
          throw new Error('Invalid response from server');
        }),
        catchError(this.handleError)
      );
  }

  resendVerificationCode(transactionId: string): Observable<boolean> {
    if (!transactionId?.trim()) {
      return throwError(() => ({
        userMessage: 'Transaction ID is required',
        errorCode: 'VALIDATION_ERROR',
        status: 400,
      }));
    }

    const url = `${this.apiUrl}/resend-code`;
    return this.http
      .post<{ success: boolean; message: string }>(url, { transactionId }, {
        headers: this.getHeaders(),
        observe: 'response',
        responseType: 'json',
      })
      .pipe(
        retry(1),
        timeout(10000),
        map((response: { headers: HttpHeaders; body: { success: boolean; message: string } | null }) => {
          if (response.headers.get('Content-Type')?.includes('application/json') && response.body) {
            return response.body.success;
          }
          throw new Error('Invalid response from server');
        }),
        catchError(this.handleError)
      );
  }





checkPaymentStatus(transactionId: string): Observable<{ 
  status: string; 
  commandeStatus: string;
  canCancel: boolean 
}> {
  return this.http.get<{ 
    status: string; 
    commandeStatus: string;
    canCancel: boolean 
  }>(`${this.apiUrl}/${transactionId}/status`, {
    headers: this.getHeaders()
  }).pipe(
    timeout(5000),
    catchError(this.handleError)
  );
}
cancelPayment(transactionId: string): Observable<{ success: boolean; message: string }> {
    if (!transactionId) {
      return throwError(() => ({ 
        errorCode: 'INVALID_REQUEST',
        userMessage: 'Transaction ID requis'
      }));
    }

    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/${transactionId}/cancel`, 
      null,
      { headers: this.getHeaders() }
    ).pipe(
      timeout(10000),
      catchError(this.handleError),
      tap(response => {
        if (response.success) {
          // Supprimer les données de session
          sessionStorage.removeItem('pendingCommandeNumero');
          sessionStorage.removeItem('currentPaymentData');
        }
      })
    );
  }
getCodeExpiry(transactionId: string): Observable<{ expiryDate: string; success: boolean }> {
  return this.http.get<{ expiryDate: string; success: boolean }>(
    `${this.apiUrl}/code-expiry/${transactionId}`,
    { headers: this.getHeaders() }
  ).pipe(
    timeout(5000),
    catchError((error: HttpErrorResponse) => {
      console.error('Erreur dans getCodeExpiry:', error);
      let userMessage = 'Impossible de récupérer le délai d’expiration';
      let errorCode = 'SERVER_ERROR';
      
      if (error.status === 404) {
        userMessage = 'Transaction non trouvée';
        errorCode = 'NOT_FOUND';
      } else if (error.status === 403) {
        userMessage = 'Non autorisé';
        errorCode = 'UNAUTHORIZED';
      }

      return throwError(() => ({
        userMessage,
        errorCode,
        status: error.status,
        technicalMessage: error.message
      }));
    })
  );
}
}