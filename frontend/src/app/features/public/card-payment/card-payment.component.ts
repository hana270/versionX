import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, NavigationStart } from '@angular/router';
import { PaymentService } from '../../../core/services/payment.service';
import { CommandeService } from '../../../core/services/commande.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { PaymentRequest } from '../../../core/models/payment.model';
import Swal from 'sweetalert2';
import { Subject, takeUntil, filter } from 'rxjs';

@Component({
  selector: 'app-card-payment',
  templateUrl: './card-payment.component.html',
  styleUrls: ['./card-payment.component.css'],
})
export class CardPaymentComponent implements OnInit, OnDestroy {
  paymentForm: FormGroup;
  isLoading = false;
  paymentData: any;
  months: number[] = Array.from({ length: 12 }, (_, i) => i + 1);
  years: number[] = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);
  private destroy$ = new Subject<void>();
  private isExiting = false;
  private isPaymentCompleted = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private paymentService: PaymentService,
    private commandeService: CommandeService,
    private authStateService: AuthStateService
  ) {
    this.paymentForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      expiryMonth: ['', [Validators.required, Validators.pattern(/^(0?[1-9]|1[0-2])$/)]],
      expiryYear: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      securityCode: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
      cardholderName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    if (!this.authStateService.isLoggedIn) {
      this.handleUnauthenticated();
      return;
    }

    const navigation = this.router.getCurrentNavigation();
    this.paymentData = navigation?.extras?.state?.['paymentData'] || history.state.paymentData;

    if (!this.paymentData?.commandeId || !this.paymentData?.commandeNumero) {
      Swal.fire({
        title: 'Erreur',
        text: 'Informations de commande manquantes.',
        icon: 'error',
        confirmButtonText: 'Retour au panier',
        confirmButtonColor: '#3085d6',
      }).then(() => this.router.navigate(['/checkout']));
      return;
    }

    const currentUser = this.authStateService.getCurrentUser();
    if (currentUser?.email) {
      this.paymentForm.patchValue({ email: currentUser.email });
    }

    this.setupNavigationGuard();
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      Swal.fire({
        title: 'Formulaire incomplet',
        text: 'Veuillez remplir correctement tous les champs.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (!this.authStateService.isLoggedIn) {
      this.handleUnauthenticated();
      return;
    }

    this.isLoading = true;
    Swal.fire({
      title: 'Traitement en cours',
      text: 'Veuillez patienter pendant que nous traitons votre paiement...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const paymentRequest: PaymentRequest = {
      commandeId: this.paymentData.commandeNumero,
      email: this.paymentForm.value.email,
      cardNumber: this.paymentForm.value.cardNumber.replace(/\s+/g, ''),
      cardholderName: this.paymentForm.value.cardholderName,
      expiryMonth: this.paymentForm.value.expiryMonth.toString().padStart(2, '0'),
      expiryYear: this.paymentForm.value.expiryYear.toString().slice(-2),
      cvv: this.paymentForm.value.securityCode,
    };

    this.paymentService
      .initiatePayment(paymentRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isPaymentCompleted = true;
          this.isLoading = false;
          Swal.close();

          if (!response.transactionId || !response.commandeId) {
            this.showError('Réponse de paiement invalide. Veuillez réessayer.');
            return;
          }

          const transactionData = {
            transactionId: response.transactionId,
            email: paymentRequest.email,
            commandeId: response.commandeId,
            commandeNumero: this.paymentData.commandeNumero,
          };

          try {
            sessionStorage.setItem('transactionData', JSON.stringify(transactionData));
            console.log('Stored transactionData in sessionStorage:', transactionData);
          } catch (e) {
            console.error('Error storing transactionData:', e);
          }

          this.isExiting = true;
          this.paymentForm.reset();
          this.router.navigate(['/payment/verify'], { state: { transactionData } })
            .then((success) => {
              if (!success) {
                console.error('Navigation to /payment/verify failed');
                this.isExiting = false;
                this.showError('Impossible de naviguer vers la vérification. Veuillez réessayer.');
              }
            })
            .catch((err) => {
              console.error('Navigation error:', err);
              this.isExiting = false;
              this.showError('Erreur lors de la navigation. Veuillez réessayer.');
            });
        },
        error: (err) => {
          this.isLoading = false;
          Swal.close();
          this.handlePaymentError(err);
        },
      });
  }

  cancelPayment(): void {
    Swal.fire({
      title: 'Annuler le paiement ?',
      text: 'La commande en attente sera supprimée.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, annuler',
      cancelButtonText: 'Non',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        if (!this.paymentData?.commandeNumero) {
          this.isLoading = false;
          this.showError('Données de commande manquantes.');
          return;
        }
        this.commandeService
          .annulerCommande(this.paymentData.commandeNumero)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.isExiting = true;
              this.isLoading = false;
              Swal.fire({
                title: 'Commande annulée',
                text: 'Votre commande a été annulée avec succès.',
                icon: 'success',
                confirmButtonText: 'Retour au panier',
                confirmButtonColor: '#3085d6',
              }).then(() => {
                this.router.navigate(['/cart']);
              });
            },
            error: (err) => {
              this.isLoading = false;
              this.showError('Échec de l\'annulation de la commande. Veuillez réessayer.');
            },
          });
      }
    });
  }

  ngOnDestroy(): void {
    if (!this.isExiting && !this.isPaymentCompleted && this.paymentData?.commandeNumero) {
      this.cancelOrderOnExit();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cancelOrderOnExit(): void {
    this.commandeService
      .annulerCommande(this.paymentData.commandeNumero)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => console.log('Commande annulée lors de la sortie'),
        error: (err) => console.error('Échec de l’annulation de la commande lors de la sortie:', err),
      });
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (value.length > 16) value = value.substring(0, 16);
    const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
    input.value = formatted;
    this.paymentForm.get('cardNumber')?.setValue(value);
  }

  private setupNavigationGuard(): void {
    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter((event) => event instanceof NavigationStart && !this.isExiting && !this.isPaymentCompleted)
      )
      .subscribe((event) => {
        const navEvent = event as NavigationStart;
        if (navEvent.navigationTrigger === 'popstate' || navEvent.navigationTrigger === 'imperative') {
          this.confirmNavigation();
        }
      });
  }

 private confirmNavigation(): void {
  if (!this.paymentData?.commandeNumero) {
    this.router.navigateByUrl(this.router.url, { replaceUrl: true });
    return;
  }

  Swal.fire({
    title: 'Quitter la page ?',
    text: 'Votre commande en attente sera annulée si vous quittez.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Oui, quitter',
    cancelButtonText: 'Rester',
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    reverseButtons: true,
    customClass: {
      popup: 'swal-custom-popup',
      title: 'swal-custom-title',
      htmlContainer: 'swal-custom-content', // Changed from 'content' to 'htmlContainer'
      confirmButton: 'swal-custom-confirm',
      cancelButton: 'swal-custom-cancel',
    },
  }).then((result) => {
    if (result.isConfirmed) {
      this.isExiting = true;
      this.commandeService
        .annulerCommande(this.paymentData.commandeNumero)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.router.navigate(['/cart']);
          },
          error: (err) => {
            Swal.fire({
              title: 'Erreur',
              text: 'Échec de l’annulation de la commande. Veuillez réessayer.',
              icon: 'error',
              confirmButtonText: 'OK',
              confirmButtonColor: '#3085d6',
            });
          },
        });
    } else {
      this.router.navigateByUrl(this.router.url, { replaceUrl: true });
    }
  });
}

  private handleUnauthenticated(): void {
    Swal.fire({
      title: 'Session expirée',
      text: 'Veuillez vous reconnecter pour continuer.',
      icon: 'error',
      confirmButtonText: 'Se connecter',
      confirmButtonColor: '#3085d6',
    }).then(() => {
      localStorage.setItem('redirectAfterLogin', this.router.url);
      this.router.navigate(['/login']);
    });
  }

  private handlePaymentError(err: any): void {
    let title = 'Erreur de paiement';
    let message = err.userMessage || 'Une erreur est survenue. Veuillez réessayer.';
    let icon: 'error' | 'warning' = 'error';

    if (err.errorCode === 'AUTHORIZATION_ERROR' || err.status === 403) {
      this.handleUnauthenticated();
      return;
    } else if (err.errorCode === 'VALIDATION_ERROR') {
      message = err.technicalMessage || 'Données de paiement invalides.';
    } else if (err.errorCode === 'NETWORK_ERROR') {
      message = 'Erreur de réseau. Vérifiez votre connexion.';
    } else if (err.errorCode === 'TIMEOUT_ERROR') {
      message = 'Délai de requête dépassé. Réessayez.';
    }

    Swal.fire({
      title,
      text: message,
      icon,
      confirmButtonText: 'OK',
      confirmButtonColor: '#3085d6',
    });
  }

  private showError(message: string): void {
    Swal.fire({
      title: 'Erreur',
      text: message,
      icon: 'error',
      confirmButtonText: 'OK',
      confirmButtonColor: '#3085d6',
    });
  }
}