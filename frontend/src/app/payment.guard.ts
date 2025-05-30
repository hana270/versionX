import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router, CanActivate } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CommandeService } from './core/services/commande.service';
import { AuthStateService } from './core/services/auth-state.service';

@Injectable({ providedIn: 'root' })
export class PaymentGuard implements CanActivate {
  constructor(
    private authState: AuthStateService,
    private router: Router,
    private commandeService: CommandeService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    console.log('PaymentGuard: Checking navigation to:', state.url);
    
    // 1. Vérifier l'authentification
    if (!this.authState.isLoggedIn) {
      console.log('PaymentGuard: User not authenticated, redirecting to /login');
      return this.router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    }

    // 2. Vérifier les données de navigation pour /payment/verify
    const isVerifyRoute = state.url.includes('/payment/verify');
    const isCardRoute = state.url.includes('/payment/card');
    
    // Récupérer les données de l'état de navigation
    const navigation = this.router.getCurrentNavigation();
    const stateData = navigation?.extras?.state;
    let paymentData = stateData?.['paymentData'];
    
    // Si les données ne sont pas dans l'état de navigation, essayer de les récupérer de history.state
    if (!paymentData) {
      console.log('PaymentGuard: No paymentData in navigation extras, checking history.state');
      paymentData = history.state.paymentData;
    }

    // Vérifier les données de navigation
    if (paymentData) {
      if ((isVerifyRoute && paymentData.transactionId && paymentData.commandeNumero) ||
          (isCardRoute && paymentData.commandeId && paymentData.commandeNumero)) {
        console.log('PaymentGuard: Valid paymentData found in navigation state:', paymentData);
        
        // Pour la route card, stocker le numéro de commande en session
        if (isCardRoute && paymentData.commandeNumero) {
          sessionStorage.setItem('pendingCommandeNumero', paymentData.commandeNumero);
          sessionStorage.setItem('currentPaymentData', JSON.stringify(paymentData));
        }
        
        return true;
      }
    }

    // 3. Vérifier les paramètres de requête
    const commandeNumero = route.queryParams['commandeNumero'];
    if (commandeNumero) {
      console.log('PaymentGuard: Checking commandeNumero from query params:', commandeNumero);
      return this.commandeService.checkCommandeAccess(commandeNumero).pipe(
        map(response => {
          if (response && response.canAccess) {
            console.log('PaymentGuard: Commande access verified');
            // Store the commande number in session storage
            sessionStorage.setItem('pendingCommandeNumero', commandeNumero);
            return true;
          }
          console.log('PaymentGuard: Commande access denied, redirecting to /checkout');
          return this.router.parseUrl('/checkout');
        }),
        catchError((err) => {
          console.error('PaymentGuard: Error checking commande access:', err);
          return of(this.router.parseUrl('/checkout'));
        })
      );
    }

    // 4. Vérifier sessionStorage pour les données persistantes
    const storedPaymentData = sessionStorage.getItem('currentPaymentData');
    const storedCommandeNumero = sessionStorage.getItem('pendingCommandeNumero');

    if (storedPaymentData && storedCommandeNumero) {
      try {
        console.log('PaymentGuard: Found data in sessionStorage');
        const parsedData = JSON.parse(storedPaymentData);
        
        // Si on a les infos dans la session, on les vérifie avec le backend
        return this.commandeService.checkCommandeAccess(storedCommandeNumero).pipe(
          map(response => {
            if (response && response.canAccess) {
              console.log('PaymentGuard: Commande access verified via sessionStorage');
              
              // Pour la page de vérification, mettre les données dans l'historique
              if (isVerifyRoute && parsedData.transactionId) {
                history.state.transactionData = {
                  transactionId: parsedData.transactionId,
                  commandeNumero: storedCommandeNumero,
                  email: parsedData.clientInfo?.email || '',
                  commandeId: parsedData.commandeId
                };
              }
              
              return true;
            }
            console.log('PaymentGuard: Commande access denied via sessionStorage');
            sessionStorage.removeItem('pendingCommandeNumero');
            sessionStorage.removeItem('currentPaymentData');
            return this.router.parseUrl('/checkout');
          }),
          catchError((err) => {
            console.error('PaymentGuard: Error checking commande access from sessionStorage:', err);
            sessionStorage.removeItem('pendingCommandeNumero');
            sessionStorage.removeItem('currentPaymentData');
            return of(this.router.parseUrl('/checkout'));
          })
        );
      } catch (e) {
        console.error('PaymentGuard: Error parsing sessionStorage data:', e);
      }
    }

    // 5. Fallback pour les utilisateurs authentifiés sur la route de vérification
    if (isVerifyRoute && this.authState.isLoggedIn) {
      console.log('PaymentGuard: Allowing verify access for authenticated user as fallback');
      return true;
    }

    // 6. Redirection finale vers /checkout
    console.log('PaymentGuard: No valid data found, redirecting to /checkout');
    return this.router.parseUrl('/checkout');
  }
}