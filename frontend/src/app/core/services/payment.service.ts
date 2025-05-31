import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, retry, tap, timeout } from 'rxjs/operators';
import { AuthStateService } from './auth-state.service';
import { ConfigServiceService } from './config-service.service';
import {
  PaymentRequest,
  PaymentResponse,
  CodeVerificationRequest,
  PaymentValidationResponse,
} from '../models/payment.model';

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
    if (!request.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email))
      throw new Error('Invalid email');
    if (!request.cardNumber || !/^\d{16}$/.test(request.cardNumber))
      throw new Error('Card number must be 16 digits');
    if (!request.cardholderName?.trim())
      throw new Error('Cardholder name is required');
    if (!request.expiryMonth || !/^(0?[1-9]|1[0-2])$/.test(request.expiryMonth))
      throw new Error('Expiry month must be between 1 and 12');
    if (!request.expiryYear || !/^\d{2}$/.test(request.expiryYear))
      throw new Error('Expiry year must be two digits (YY)');
    if (!request.cvv || !/^\d{3}$/.test(request.cvv))
      throw new Error('CVV must be 3 digits');
  }

  private validateVerificationRequest(request: CodeVerificationRequest): void {
    if (!request.transactionId?.trim())
      throw new Error('Transaction ID is required');
    if (!request.verificationCode || !/^\d{6}$/.test(request.verificationCode))
      throw new Error('Verification code must be 6 digits');
  }

  private handleError(error: unknown): Observable<never> {
    console.error('PaymentService error:', error); // Debug logging

    // Messages par défaut
    let userMessage =
      'Une erreur est survenue lors du traitement de votre paiement';
    let technicalMessage = 'Unknown error';
    let errorCode = 'UNKNOWN_ERROR';
    let status = 0;
    let transactionId: string | undefined = undefined;
    let showRetryButton = false;
    let showBackToPaymentButton = false;

    // Extraction des informations d'erreur
    if (error instanceof HttpErrorResponse) {
      status = error.status;
      technicalMessage = error.error?.message || error.message;
      transactionId = error.error?.transactionId;

      // Analyse des messages d'erreur spécifiques
      const errorMessage = technicalMessage.toLowerCase();

      if (status === 0) {
        userMessage = 'Erreur de connexion : Impossible de joindre le serveur';
        errorCode = 'NETWORK_ERROR';
        showRetryButton = true;
      } else if (status === 400) {
        if (errorMessage.includes('code de vérification incorrect')) {
          userMessage = 'Le code saisi est incorrect';
          errorCode = 'INVALID_CODE';

          // Message spécial pour la 3ème tentative
          if (errorMessage.includes('tentative 3')) {
            userMessage =
              'Code incorrect - Vous avez utilisé vos 3 tentatives.';
            errorCode = 'MAX_ATTEMPTS';
            showBackToPaymentButton = true;
          }
        } else if (errorMessage.includes('code a expiré')) {
          userMessage = 'Le code de vérification a expiré';
          errorCode = 'CODE_EXPIRED';
          showRetryButton = true;
        } else if (
          errorMessage.includes('tentatives de vérification atteint')
        ) {
          userMessage = 'Vous avez atteint le nombre maximum de tentatives (3)';
          errorCode = 'MAX_ATTEMPTS';
          showBackToPaymentButton = true;
        } else if (errorMessage.includes('renvois de code atteint')) {
          userMessage =
            'Vous avez atteint le nombre maximum de renvois de code (3)';
          errorCode = 'MAX_RESEND';
          showBackToPaymentButton = true;
        } else {
          userMessage = 'Données de paiement invalides';
          errorCode = 'VALIDATION_ERROR';
        }
      } else if (status === 403) {
        userMessage = 'Action non autorisée - Veuillez vous reconnecter';
        errorCode = 'AUTHORIZATION_ERROR';
      } else if (status === 404) {
        userMessage = 'Transaction introuvable - Elle a peut-être expiré';
        errorCode = 'NOT_FOUND';
        showBackToPaymentButton = true;
      } else if (status === 500) {
        userMessage = 'Erreur serveur - Veuillez réessayer plus tard';
        errorCode = 'SERVER_ERROR';
        showRetryButton = true;
      }
    } else if (error instanceof Error) {
      technicalMessage = error.message;

      if (error.name === 'TimeoutError') {
        userMessage = 'Délai dépassé - Veuillez réessayer';
        errorCode = 'TIMEOUT_ERROR';
        showRetryButton = true;
      }
    }

    // Construction de l'objet d'erreur avec toutes les informations
    const errorObject = {
      userMessage,
      technicalMessage,
      errorCode,
      status,
      transactionId,
      showRetryButton,
      showBackToPaymentButton,
      // Ajout d'un indicateur pour les erreurs critiques
      isCritical:
        errorCode === 'MAX_ATTEMPTS' ||
        errorCode === 'MAX_RESEND' ||
        errorCode === 'NOT_FOUND',
    };

    return throwError(() => errorObject);
  }

  initiatePayment(request: PaymentRequest): Observable<PaymentResponse> {
    try {
      // Validation améliorée
      if (!request.commandeId) {
        return throwError(() => ({
          userMessage: 'ID de commande requis',
          errorCode: 'VALIDATION_ERROR',
          status: 400,
        }));
      }

      // Log the commandeId for debugging
      console.log('Initiating payment with commandeId:', request.commandeId);

      // Normalisation de l'ID de commande
      const commandeId = request.commandeId.toString().trim();
      const normalizedRequest = {
        ...request,
        commandeId: commandeId,
        cardNumber: request.cardNumber.replace(/\s+/g, ''),
        expiryMonth: request.expiryMonth.padStart(2, '0'),
        expiryYear: request.expiryYear.slice(-2),
      };

      const url = `${this.apiUrl}/initiate`;
      return this.http
        .post<PaymentResponse>(url, normalizedRequest, {
          headers: this.getHeaders(),
          observe: 'response',
        })
        .pipe(
          timeout(15000),
          map((response) => {
            if (!response.body) {
              throw new Error('Réponse vide du serveur');
            }
            return response.body;
          }),
          catchError((error: HttpErrorResponse) => {
            console.error('Payment error:', error);
            let userMessage = 'Erreur lors du paiement';

            if (error.status === 400) {
              userMessage =
                error.error?.message || 'Données de paiement invalides';
            } else if (error.status === 404) {
              userMessage = 'Commande non trouvée';
            } else if (error.status === 403) {
              userMessage = 'Non autorisé';
            }

            return throwError(() => ({
              userMessage,
              errorCode: error.error?.errorCode || 'PAYMENT_ERROR',
              status: error.status,
              technicalMessage: error.message,
            }));
          })
        );
    } catch (err) {
      return throwError(() => ({
        userMessage: 'Erreur de validation',
        errorCode: 'VALIDATION_ERROR',
        status: 400,
        technicalMessage:
          err instanceof Error ? err.message : 'Erreur inconnue',
      }));
    }
  }

  verifyCode(
    request: CodeVerificationRequest
  ): Observable<PaymentValidationResponse> {
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
        map(
          (response: {
            headers: HttpHeaders;
            body: PaymentValidationResponse | null;
          }) => {
            if (
              response.headers
                .get('Content-Type')
                ?.includes('application/json') &&
              response.body
            ) {
              // Récupérer l'ID numérique de la commande depuis la réponse
              const commandeId = response.body.commandeId;
              if (!commandeId) {
                throw new Error('ID de commande manquant dans la réponse');
              }
              return {
                ...response.body,
                numericCommandeId: commandeId, // Ajouter l'ID numérique
              };
            }
            throw new Error('Invalid response from server');
          }
        ),
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
      .post<{ success: boolean; message: string }>(
        url,
        { transactionId },
        {
          headers: this.getHeaders(),
          observe: 'response',
          responseType: 'json',
        }
      )
      .pipe(
        retry(1),
        timeout(10000),
        map(
          (response: {
            headers: HttpHeaders;
            body: { success: boolean; message: string } | null;
          }) => {
            if (
              response.headers
                .get('Content-Type')
                ?.includes('application/json') &&
              response.body
            ) {
              return response.body.success;
            }
            throw new Error('Invalid response from server');
          }
        ),
        catchError(this.handleError)
      );
  }

  checkPaymentStatus(transactionId: string): Observable<{
    status: string;
    commandeStatus: string;
    canCancel: boolean;
  }> {
    return this.http
      .get<{
        status: string;
        commandeStatus: string;
        canCancel: boolean;
      }>(`${this.apiUrl}/${transactionId}/status`, {
        headers: this.getHeaders(),
      })
      .pipe(timeout(5000), catchError(this.handleError));
  }
  cancelPayment(
    transactionId: string
  ): Observable<{ success: boolean; message: string }> {
    if (!transactionId) {
      return throwError(() => ({
        errorCode: 'INVALID_REQUEST',
        userMessage: 'Transaction ID requis',
      }));
    }

    return this.http
      .post<{ success: boolean; message: string }>(
        `${this.apiUrl}/${transactionId}/cancel`,
        null,
        { headers: this.getHeaders() }
      )
      .pipe(
        timeout(10000),
        catchError(this.handleError),
        tap((response) => {
          if (response.success) {
            // Supprimer les données de session
            sessionStorage.removeItem('pendingCommandeNumero');
            sessionStorage.removeItem('currentPaymentData');
          }
        })
      );
  }
  getCodeExpiry(
    transactionId: string
  ): Observable<{ expiryDate: string; success: boolean }> {
    return this.http
      .get<{ expiryDate: string; success: boolean }>(
        `${this.apiUrl}/code-expiry/${transactionId}`,
        { headers: this.getHeaders() }
      )
      .pipe(
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
            technicalMessage: error.message,
          }));
        })
      );
  }
}
