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
      cardholderName: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]*$/)]],
      email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
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
      this.showError('Erreur', 'Informations de commande manquantes.', () => this.router.navigate(['/checkout']));
      return;
    }

    const currentUser = this.authStateService.getCurrentUser();
    if (currentUser?.email) {
      this.paymentForm.patchValue({ email: currentUser.email });
    }

    this.setupNavigationGuard();
    this.setupRealTimeValidation();
  }

  private setupRealTimeValidation(): void {
    this.paymentForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      Object.keys(this.paymentForm.controls).forEach((key) => {
        const control = this.paymentForm.get(key);
        if (control?.touched && control?.invalid) {
          control.markAsTouched();
        }
      });
    });
  }

onSubmit(): void {
    if (this.paymentForm.invalid) {
        this.paymentForm.markAllAsTouched();
        this.showError('Formulaire incomplet', 'Veuillez remplir correctement tous les champs obligatoires.');
        return;
    }

    if (!this.authStateService.isLoggedIn) {
        this.handleUnauthenticated();
        return;
    }

    // Validation de la date d'expiration
    const expiryMonth = parseInt(this.paymentForm.value.expiryMonth, 10);
    const expiryYear = parseInt(this.paymentForm.value.expiryYear, 10);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
        this.showError('Date invalide', 'La date d\'expiration de la carte est dépassée.');
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
        cardholderName: this.paymentForm.value.cardholderName.trim(),
        expiryMonth: this.paymentForm.value.expiryMonth.toString().padStart(2, '0'),
        expiryYear: this.paymentForm.value.expiryYear.toString().slice(-2),
        cvv: this.paymentForm.value.securityCode,
    };

    this.paymentService.initiatePayment(paymentRequest).subscribe({
        next: (response) => {
            this.isPaymentCompleted = true;
            this.isLoading = false;
            Swal.close();

            if (!response?.transactionId) {
                console.error('Invalid payment response:', response);
                this.showError('Erreur', 'Réponse de paiement invalide. Veuillez réessayer.');
                return;
            }

            const transactionData = {
                transactionId: response.transactionId,
                email: paymentRequest.email,
                commandeId: this.paymentData.commandeNumero,
                commandeNumero: this.paymentData.commandeNumero,
                referencePaiement: response.referencePaiement || ''
            };

            sessionStorage.setItem('transactionData', JSON.stringify(transactionData));
            this.isExiting = true;
            this.router.navigate(['/payment/verify'], { 
                state: { transactionData },
                replaceUrl: true
            });
        },
        error: (err) => {
            this.isLoading = false;
            Swal.close();
            this.handlePaymentError(err);
        }
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
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#005f7a',
      customClass: {
        popup: 'swal2-popup',
        title: 'swal2-title',
        htmlContainer: 'swal2-html-container',
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-cancel',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        if (!this.paymentData?.commandeNumero) {
          this.isLoading = false;
          this.showError('Erreur', 'Données de commande manquantes.');
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
                timer: 2000,
                showConfirmButton: false,
                customClass: {
                  popup: 'swal2-popup',
                  title: 'swal2-title',
                  htmlContainer: 'swal2-html-container',
                },
              }).then(() => {
                this.router.navigate(['/cart']);
              });
            },
            error: (err) => {
              this.isLoading = false;
              this.showError('Erreur', 'Échec de l’annulation de la commande. Veuillez réessayer.');
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
    if (!this.paymentData?.commandeNumero) {
      console.warn('No commandeNumero available for cancellation on exit');
      return;
    }
    Swal.fire({
      title: 'Annuler la commande ?',
      text: 'Vous êtes sur le point de quitter. Voulez-vous annuler la commande en cours ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, annuler',
      cancelButtonText: 'Rester',
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#005f7a',
      customClass: {
        popup: 'swal2-popup',
        title: 'swal2-title',
        htmlContainer: 'swal2-html-container',
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-cancel',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.isExiting = true;
        this.commandeService
          .annulerCommande(this.paymentData.commandeNumero)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              console.log('Commande annulée lors de la sortie');
              this.router.navigate(['/cart']);
            },
            error: (err) => {
              console.error('Échec de l’annulation de la commande lors de la sortie:', err);
              this.showError('Erreur', 'Échec de l’annulation de la commande. Veuillez réessayer.');
            },
          });
      } else {
        // Prevent component destruction if user chooses to stay
        this.isExiting = false;
        this.router.navigateByUrl(this.router.url, { replaceUrl: true });
      }
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
        // Handle all navigation triggers (popstate, imperative, etc.)
        this.confirmNavigation(navEvent.url);
      });
  }

  private confirmNavigation(targetUrl: string): void {
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
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#005f7a',
      customClass: {
        popup: 'swal2-popup',
        title: 'swal2-title',
        htmlContainer: 'swal2-html-container',
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-cancel',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.isExiting = true;
        this.commandeService
          .annulerCommande(this.paymentData.commandeNumero)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.router.navigate([targetUrl]).catch(() => this.router.navigate(['/cart']));
            },
            error: (err) => {
              this.isExiting = false;
              this.showError('Erreur', 'Échec de l’annulation de la commande. Veuillez réessayer.');
              this.router.navigateByUrl(this.router.url, { replaceUrl: true });
            },
          });
      } else {
        this.router.navigateByUrl(this.router.url, { replaceUrl: true });
      }
    });
  }

  private handleUnauthenticated(): void {
    this.showError('Session expirée', 'Veuillez vous reconnecter pour continuer.', () => {
      localStorage.setItem('redirectAfterLogin', this.router.url);
      this.router.navigate(['/login']);
    });
  }

  private handlePaymentError(err: any): void {
    let title = 'Erreur de paiement';
    let message = err.userMessage || 'Une erreur inattendue est survenue. Veuillez réessayer.';
    let icon: 'error' | 'warning' = 'error';

    if (err.errorCode === 'AUTHORIZATION_ERROR' || err.status === 403) {
      this.handleUnauthenticated();
      return;
    } else if (err.errorCode === 'VALIDATION_ERROR') {
      message = err.technicalMessage || 'Les données de paiement sont invalides. Vérifiez vos informations.';
    } else if (err.errorCode === 'NETWORK_ERROR') {
      message = 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
      icon = 'warning';
    } else if (err.errorCode === 'TIMEOUT_ERROR') {
      message = 'La requête a expiré. Veuillez réessayer dans quelques instants.';
      icon = 'warning';
    } else if (err.errorCode === 'INSUFFICIENT_FUNDS') {
      message = 'Fonds insuffisants sur votre carte. Veuillez utiliser une autre carte.';
    } else if (err.errorCode === 'CARD_DECLINED') {
      message = 'Votre carte a été refusée. Contactez votre banque ou essayez une autre carte.';
    }

    this.showError(title, message, undefined, icon);
  }

  private showError(title: string, message: string, callback?: () => void, icon: 'error' | 'warning' = 'error'): void {
    Swal.fire({
      title,
      text: message,
      icon,
      timer: 2000,
      showConfirmButton: false,
      customClass: {
        popup: 'swal2-popup',
        title: 'swal2-title',
        htmlContainer: 'swal2-html-container',
      },
    }).then(() => {
      if (callback) callback();
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): string | undefined {
    if (!this.isExiting && !this.isPaymentCompleted && this.paymentForm.dirty && this.paymentData?.commandeNumero) {
      event.preventDefault();
      // Modern browsers ignore custom messages, but we include it for compatibility
      const message = 'Voulez-vous vraiment quitter ? Votre commande sera annulée.';
      event.returnValue = message;
      // Trigger SweetAlert for user confirmation
      this.confirmNavigation('/cart');
      return message;
    }
    return undefined;
  }
}