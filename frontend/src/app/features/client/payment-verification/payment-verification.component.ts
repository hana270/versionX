import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, NavigationStart } from '@angular/router';
import { PaymentService } from '../../../core/services/payment.service';
import { CommandeService } from '../../../core/services/commande.service';
import { Location } from '@angular/common';
import Swal from 'sweetalert2';
import { filter, interval, Subject, takeUntil } from 'rxjs';
import { CodeVerificationRequest } from '../../../core/models/payment.model';

interface TransactionData {
  transactionId: string;
  commandeNumero: string;  // Format "CMD-20250530-3EB97"
  commandeId: number;      // ID numérique simple
  email: string;
}

@Component({
  selector: 'app-payment-verification',
  templateUrl: './payment-verification.component.html',
  styleUrls: ['./payment-verification.component.css'],
})
export class PaymentVerificationComponent implements OnInit, OnDestroy {
  verificationForm: FormGroup;
  isLoading = false;
  transactionData: TransactionData | null = null;
  timeLeft: number = 600;
  timerDisplay: string = '10:00';
  private destroy$ = new Subject<void>();
  resendAttempts = 0;
  maxResendAttempts = 3;
  private isExiting = false;
  private isPaymentVerified = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private paymentService: PaymentService,
    private commandeService: CommandeService,
    private location: Location
  ) {
    this.verificationForm = this.fb.group({
      verificationCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  ngOnInit(): void {
    // Retrieve transaction data from navigation state or session storage
    const navigation = this.router.getCurrentNavigation();
    this.transactionData = navigation?.extras?.state?.['transactionData'] || history.state['transactionData'];

    if (!this.transactionData?.transactionId || !this.transactionData?.commandeNumero || !this.transactionData?.commandeId) {
      const storedTransactionData = sessionStorage.getItem('transactionData');
      if (storedTransactionData) {
        try {
          this.transactionData = JSON.parse(storedTransactionData) as TransactionData;
          console.log('Données de transaction récupérées depuis sessionStorage:', this.transactionData);
        } catch (e) {
          console.error('Erreur lors de l’analyse des données de sessionStorage:', e);
        }
      }
    }

    // Validate required transaction data
    if (!this.transactionData?.transactionId || !this.transactionData?.commandeNumero || !this.transactionData?.commandeId) {
      Swal.fire({
        title: 'Erreur',
        text: 'Les informations de paiement ou de commande sont manquantes.',
        icon: 'error',
        confirmButtonText: 'Retour',
        confirmButtonColor: '#3085d6',
      }).then(() => this.router.navigate(['/checkout']));
      return;
    }

    // Fetch code expiry
    this.paymentService.getCodeExpiry(this.transactionData.transactionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { success: boolean; expiryDate: string }) => {
          if (response.success && response.expiryDate) {
            const expiryDate = new Date(response.expiryDate);
            const now = new Date();
            this.timeLeft = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 1000));
            this.updateTimerDisplay();
          } else {
            this.timeLeft = 600;
            this.updateTimerDisplay();
          }
        },
        error: (err) => {
          console.error('Erreur lors de la récupération du délai d’expiration:', err);
          if (err.status === 404) {
            Swal.fire({
              title: 'Transaction introuvable',
              text: 'La transaction n\'existe pas ou a expiré.',
              icon: 'error',
              confirmButtonText: 'OK',
              confirmButtonColor: '#3085d6',
            }).then(() => this.router.navigate(['/checkout']));
          } else {
            this.timeLeft = 600;
            this.updateTimerDisplay();
            Swal.fire({
              title: 'Problème de connexion',
              text: 'Le serveur met trop de temps à répondre. Vous pouvez continuer à entrer le code.',
              icon: 'warning',
              confirmButtonText: 'OK',
              confirmButtonColor: '#3085d6',
            });
          }
        },
      });

    // Start timer
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.timeLeft > 0) {
          this.timeLeft--;
          this.updateTimerDisplay();
        } else {
          this.verificationForm.disable();
          this.handleCodeExpired();
        }
      });

    this.setupNavigationGuard();
  }

  ngOnDestroy(): void {
    if (!this.isExiting && !this.isPaymentVerified && this.transactionData?.commandeNumero) {
      this.cancelOrderOnExit();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateTimerDisplay(): void {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    this.timerDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }


onSubmit(): void {
    if (this.verificationForm.invalid || this.timeLeft <= 0) {
        this.verificationForm.markAllAsTouched();
        return;
    }

    this.isLoading = true;
    Swal.fire({
        title: 'Vérification en cours',
        text: 'Veuillez patienter...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
    });

    const request: CodeVerificationRequest = {
        transactionId: this.transactionData!.transactionId,
        verificationCode: this.verificationForm.value.verificationCode,
    };

    this.paymentService.verifyCode(request).subscribe({
        next: (response: any) => {
            this.isLoading = false;
            this.isExiting = true;
            this.isPaymentVerified = true;
            Swal.close();
            this.cleanupSessionStorage();
            
            // Utiliser l'ID numérique de la commande pour la navigation
            const commandeId = response.numericCommandeId || this.transactionData?.commandeId;
            
            if (!commandeId) {
                throw new Error('ID de commande non disponible');
            }

            Swal.fire({
                title: 'Paiement réussi',
                text: `Votre paiement est validé. Référence : ${response.referencePaiement}`,
                icon: 'success',
                confirmButtonText: 'Voir la confirmation',
                confirmButtonColor: '#3085d6',
            }).then(() => {
                this.router.navigate([`/commande-confirmation/${commandeId}`], {
                    state: { 
                        transactionData: this.transactionData,
                        referencePaiement: response.referencePaiement 
                    },
                    replaceUrl: true,
                }).catch((err) => {
                    console.error('Erreur de navigation:', err);
                    this.router.navigate(['/commande-confirmation', commandeId], {
                        queryParams: {
                            reference: response.referencePaiement
                        }
                    });
                });
            });
        },
        error: (err) => {
            this.isLoading = false;
            Swal.close();
            this.handleVerificationError(err);
        }
    });
}

  resendCode(): void {
    if (this.resendAttempts >= this.maxResendAttempts) {
      Swal.fire({
        title: 'Limite atteinte',
        text: 'Vous avez envoyé trop de codes.',
        icon: 'error',
        confirmButtonText: 'Retour au paiement',
        confirmButtonColor: '#3085d6',
        customClass: {
          popup: 'swal-custom-popup',
          title: 'swal-custom-title',
          htmlContainer: 'swal-custom-content',
          confirmButton: 'swal-custom-confirm',
          cancelButton: 'swal-custom-cancel',
        },
      }).then(() => this.cancelOrderAndNavigate());
      return;
    }

    if (!this.transactionData) {
      this.isLoading = false;
      Swal.fire({
        title: 'Erreur',
        text: 'Données de paiement manquantes.',
        icon: 'error',
        confirmButtonText: 'Retour',
        confirmButtonColor: '#3085d6',
        customClass: {
          popup: 'swal-custom-popup',
          title: 'swal-custom-title',
          htmlContainer: 'swal-custom-content',
          confirmButton: 'swal-custom-confirm',
          cancelButton: 'swal-custom-cancel',
        },
      }).then(() => this.router.navigate(['/checkout']));
      return;
    }

    this.isLoading = true;
    Swal.fire({
      title: 'Envoi en cours',
      text: 'Envoi d’un nouveau code...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        htmlContainer: 'swal-custom-content',
        confirmButton: 'swal-custom-confirm',
        cancelButton: 'swal-custom-cancel',
      },
    });

    this.paymentService
      .resendVerificationCode(this.transactionData.transactionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.resendAttempts++;
          this.paymentService
            .getCodeExpiry(this.transactionData!.transactionId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response: { expiryDate: string }) => {
                const expiryDate = new Date(response.expiryDate);
                const now = new Date();
                this.timeLeft = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 1000));
                this.updateTimerDisplay();
              },
              error: (err) => {
                console.warn('Échec de la récupération du nouveau délai, utilisation du délai par défaut', err);
                this.timeLeft = 600;
                this.updateTimerDisplay();
              },
            });
          this.verificationForm.reset();
          this.verificationForm.enable();
          Swal.close();
          Swal.fire({
            title: 'Nouveau code envoyé',
            text: `Un nouveau code a été envoyé à ${this.transactionData!.email}. Tentatives restantes : ${this.maxResendAttempts - this.resendAttempts}`,
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6',
            customClass: {
              popup: 'swal-custom-popup',
              title: 'swal-custom-title',
              htmlContainer: 'swal-custom-content',
              confirmButton: 'swal-custom-confirm',
              cancelButton: 'swal-custom-cancel',
            },
          });
        },
        error: (err) => {
          this.isLoading = false;
          Swal.close();
          this.handleVerificationError(err);
        },
      });
  }

  cancelPayment(): void {
    Swal.fire({
      title: 'Annuler le paiement ?',
      text: 'Votre commande sera supprimée.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, annuler',
      cancelButtonText: 'Non',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        htmlContainer: 'swal-custom-content',
        confirmButton: 'swal-custom-confirm',
        cancelButton: 'swal-custom-cancel',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        if (!this.transactionData?.commandeNumero) {
          this.isLoading = false;
          Swal.fire({
            title: 'Erreur',
            text: 'Données de commande manquantes.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6',
            customClass: {
              popup: 'swal-custom-popup',
              title: 'swal-custom-title',
              htmlContainer: 'swal-custom-content',
              confirmButton: 'swal-custom-confirm',
              cancelButton: 'swal-custom-cancel',
            },
          }).then(() => this.router.navigate(['/cart']));
          return;
        }
        this.commandeService
          .annulerCommande(this.transactionData.commandeNumero)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.isExiting = true;
              this.isLoading = false;
              this.cleanupSessionStorage();
              Swal.fire({
                title: 'Commande annulée',
                text: 'Votre commande a été annulée.',
                icon: 'success',
                confirmButtonText: 'Retour au panier',
                confirmButtonColor: '#3085d6',
                customClass: {
                  popup: 'swal-custom-popup',
                  title: 'swal-custom-title',
                  htmlContainer: 'swal-custom-content',
                  confirmButton: 'swal-custom-confirm',
                  cancelButton: 'swal-custom-cancel',
                },
              }).then(() => {
                this.router.navigate(['/cart']);
              });
            },
            error: (err) => {
              this.isLoading = false;
              this.handleVerificationError(err);
            },
          });
      }
    });
  }

  private handleCodeExpired(): void {
    if (this.resendAttempts < this.maxResendAttempts) {
      this.resendCode();
    } else {
      Swal.fire({
        title: 'Limite atteinte',
        text: 'Le code a expiré et vous avez envoyé trop de codes.',
        icon: 'error',
        confirmButtonText: 'Retour au paiement',
        confirmButtonColor: '#3085d6',
        customClass: {
          popup: 'swal-custom-popup',
          title: 'swal-custom-title',
          htmlContainer: 'swal-custom-content',
          confirmButton: 'swal-custom-confirm',
          cancelButton: 'swal-custom-cancel',
        },
      }).then(() => this.cancelOrderAndNavigate());
    }
  }

  private cancelOrderAndNavigate(): void {
    this.isLoading = true;
    if (!this.transactionData?.commandeNumero) {
      this.isLoading = false;
      this.cleanupSessionStorage();
      this.router.navigate(['/cart']);
      return;
    }
    this.commandeService
      .annulerCommande(this.transactionData.commandeNumero)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isExiting = true;
          this.isLoading = false;
          this.cleanupSessionStorage();
          this.router.navigate(['/cart']);
        },
        error: (err) => {
          this.isLoading = false;
          Swal.fire({
            title: 'Erreur',
            text: 'Impossible d’annuler la commande. Réessayez.',
            icon: 'error',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6',
            customClass: {
              popup: 'swal-custom-popup',
              title: 'swal-custom-title',
              htmlContainer: 'swal-custom-content',
              confirmButton: 'swal-custom-confirm',
              cancelButton: 'swal-custom-cancel',
            },
          });
        },
      });
  }

  private cancelOrderOnExit(): void {
    if (!this.transactionData?.commandeNumero) {
      console.warn('No commandeNumero available for cancellation on exit');
      this.router.navigate(['/cart']);
      return;
    }
    Swal.fire({
      title: 'Quitter la page ?',
      text: 'Votre commande sera annulée si vous quittez.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, annuler',
      cancelButtonText: 'Rester',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        htmlContainer: 'swal-custom-content',
        confirmButton: 'swal-custom-confirm',
        cancelButton: 'swal-custom-cancel',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.isExiting = true;
        this.commandeService
          .annulerCommande(this.transactionData!.commandeNumero)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.cleanupSessionStorage();
              this.router.navigate(['/cart']);
            },
            error: (err) => {
              this.isExiting = false;
              console.error('Échec de l’annulation de la commande lors de la sortie:', err);
              Swal.fire({
                title: 'Erreur',
                text: 'Impossible d’annuler la commande. Réessayez.',
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#3085d6',
                customClass: {
                  popup: 'swal-custom-popup',
                  title: 'swal-custom-title',
                  htmlContainer: 'swal-custom-content',
                  confirmButton: 'swal-custom-confirm',
                  cancelButton: 'swal-custom-cancel',
                },
              });
            },
          });
      } else {
        this.isExiting = false;
        this.router.navigateByUrl(this.router.url, { replaceUrl: true });
      }
    });
  }

  private handleVerificationError(err: any): void {
    let title = 'Erreur';
    let message = err.userMessage || 'Une erreur s’est produite.';
    let icon: 'error' | 'warning' = 'error';
    let confirmButtonText = 'OK';

    if (err.errorCode === 'INVALID_CODE') {
      message = 'Code incorrect. Réessayez.';
    } else if (err.errorCode === 'CODE_EXPIRED') {
      message = 'Le code a expiré. Un nouveau code va être envoyé.';
      icon = 'warning';
      confirmButtonText = 'OK';
    } else if (err.errorCode === 'MAX_ATTEMPTS') {
      message = 'Trop de tentatives. Recommencez le paiement.';
      confirmButtonText = 'Retour au paiement';
    } else if (err.errorCode === 'MAX_RESEND') {
      message = 'Trop de codes envoyés.';
      confirmButtonText = 'Retour au paiement';
    } else if (err.errorCode === 'AUTHORIZATION_ERROR') {
      Swal.fire({
        title: 'Session expirée',
        text: 'Veuillez vous reconnecter.',
        icon: 'error',
        confirmButtonText: 'Se connecter',
        confirmButtonColor: '#3085d6',
        customClass: {
          popup: 'swal-custom-popup',
          title: 'swal-custom-title',
          htmlContainer: 'swal-custom-content',
          confirmButton: 'swal-custom-confirm',
          cancelButton: 'swal-custom-cancel',
        },
      }).then(() => {
        localStorage.setItem('redirectAfterLogin', this.router.url);
        this.router.navigate(['/login']);
      });
      return;
    } else if (err.name === 'TimeoutError') {
      message = 'Le serveur met trop de temps à répondre. Réessayez.';
      confirmButtonText = 'Réessayer';
    }

    Swal.fire({
      title,
      text: message,
      icon,
      confirmButtonText,
      confirmButtonColor: '#3085d6',
      showCancelButton: false,
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        htmlContainer: 'swal-custom-content',
        confirmButton: 'swal-custom-confirm',
        cancelButton: 'swal-custom-cancel',
      },
    }).then((result) => {
      if (result.isConfirmed && err.errorCode === 'CODE_EXPIRED' && this.resendAttempts < this.maxResendAttempts) {
        this.resendCode();
      } else if (result.isConfirmed && (err.errorCode === 'MAX_ATTEMPTS' || err.errorCode === 'MAX_RESEND')) {
        this.cancelOrderAndNavigate();
      } else if (result.isConfirmed && err.name === 'TimeoutError') {
        this.resendCode();
      }
    });
  }

  setupNavigationGuard(): void {
    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter((event) => event instanceof NavigationStart && !this.isExiting && !this.isPaymentVerified)
      )
      .subscribe((event) => {
        const navEvent = event as NavigationStart;
        this.confirmNavigation(navEvent.url);
      });
  }

  private confirmNavigation(targetUrl: string): void {
    if (!this.transactionData?.commandeNumero) {
      this.router.navigateByUrl(this.router.url, { replaceUrl: true });
      return;
    }

    Swal.fire({
      title: 'Quitter la page ?',
      text: 'Votre commande sera annulée si vous quittez.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, annuler',
      cancelButtonText: 'Rester',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        htmlContainer: 'swal-custom-content',
        confirmButton: 'swal-custom-confirm',
        cancelButton: 'swal-custom-cancel',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.isExiting = true;
        this.commandeService
          .annulerCommande(this.transactionData!.commandeNumero)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.cleanupSessionStorage();
              this.router.navigate([targetUrl]).catch(() => this.router.navigate(['/cart']));
            },
            error: (err) => {
              this.isExiting = false;
              Swal.fire({
                title: 'Erreur',
                text: 'Impossible d’annuler la commande. Réessayez.',
                icon: 'error',
                confirmButtonText: 'OK',
                confirmButtonColor: '#3085d6',
                customClass: {
                  popup: 'swal-custom-popup',
                  title: 'swal-custom-title',
                  htmlContainer: 'swal-custom-content',
                  confirmButton: 'swal-custom-confirm',
                  cancelButton: 'swal-custom-cancel',
                },
              });
              this.router.navigateByUrl(this.router.url, { replaceUrl: true });
            },
          });
      } else {
        this.router.navigateByUrl(this.router.url, { replaceUrl: true });
      }
    });
  }

  private cleanupSessionStorage(): void {
    try {
      sessionStorage.removeItem('transactionData');
      sessionStorage.removeItem('currentPaymentData');
      sessionStorage.removeItem('pendingCommandeNumero');
      sessionStorage.removeItem('pendingCommandeId');
      console.log('SessionStorage vidé');
    } catch (e) {
      console.error('Erreur lors du vidage de sessionStorage:', e);
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): string | undefined {
    if (!this.isExiting && !this.isPaymentVerified && this.transactionData?.commandeNumero) {
      event.preventDefault();
      const message = 'Voulez-vous vraiment quitter ? Votre commande sera annulée.';
      event.returnValue = message;
      this.confirmNavigation('/cart');
      return message;
    }
    return undefined;
  }
}