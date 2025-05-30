import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router, CanDeactivate } from '@angular/router';
import { Observable, of, firstValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { PaymentService } from './core/services/payment.service';
import { CommandeService } from './core/services/commande.service';

@Injectable({ providedIn: 'root' })
export class PaymentInProgressGuard implements CanDeactivate<any> {
  constructor(
    private paymentService: PaymentService,
    private commandeService: CommandeService,
    private router: Router
  ) {}

  canDeactivate(
    component: any,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const pendingCommande = sessionStorage.getItem('pendingCommandeNumero');
    
    if (!pendingCommande) {
      return true;
    }

    // Check if navigating to payment verification or confirmation page
    if (nextState?.url.includes('/payment/verify') || nextState?.url.includes('/commande-confirmation')) {
      // Allow navigation to payment verification or confirmation without showing the warning
      return true;
    }

    // Using Promise directly to handle the modal result and subsequent API call
    return new Promise<boolean | UrlTree>((resolve) => {
      Swal.fire({
        title: 'Paiement en cours',
        text: 'Vous avez une commande en attente de paiement. Voulez-vous vraiment quitter?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Oui, annuler la commande',
        cancelButtonText: 'Non, rester',
      }).then((result) => {
        if (result.isConfirmed) {
          // Handle the confirmed case - user wants to cancel and navigate away
          this.commandeService.annulerCommande(pendingCommande)
            .pipe(
              map(() => {
                // Commande successfully cancelled
                sessionStorage.removeItem('pendingCommandeNumero');
                sessionStorage.removeItem('currentPaymentData');
                return true;
              }),
              catchError(() => {
                // Error cancelling commande, but still allow navigation and clean up
                console.error('Erreur lors de l\'annulation de la commande');
                sessionStorage.removeItem('pendingCommandeNumero');
                sessionStorage.removeItem('currentPaymentData');
                return of(true);
              })
            )
            .subscribe({
              next: (canNavigate) => resolve(canNavigate),
              error: () => {
                // Failsafe - should never reach here due to catchError
                console.error('Erreur inattendue lors de l\'annulation');
                sessionStorage.removeItem('pendingCommandeNumero');
                sessionStorage.removeItem('currentPaymentData');
                resolve(true);
              }
            });
        } else {
          // User chose to stay
          resolve(false);
        }
      }).catch(() => {
        // Error with the Swal modal itself - rare but possible
        console.error('Erreur lors de l\'affichage de la modale');
        resolve(false); // Default to preventing navigation on modal error
      });
    });
  }
}