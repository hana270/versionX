import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { PanierItem } from '../../../core/models/panier-item.model';
import { User } from '../../../core/models/user.model';
import { CartService } from '../../../core/services/cart.service';
import { CommandeService } from '../../../core/services/commande.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { BassinService } from '../../../core/services/bassin.service';
import { of, switchMap, finalize, catchError, throwError } from 'rxjs';
import {
  CommandeResponse,
  CreationCommandeRequest,
  PanierItemDTO,
} from '../../../core/models/commande.models';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { HostListener } from '@angular/core';
@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css'],
})
export class CheckoutComponent implements OnInit {
  clientInfoForm!: FormGroup;
  checkoutForm!: FormGroup;
  isLoading = false;
  cartItems: PanierItem[] = [];
  total = 0;
  vatRate = 0.19;
  vatAmount = 0;
  subtotal = 0;
  shippingCost = 20; // Fixed shipping cost (20 DT)
  currentStep = 'info';
  userData: User | null = null;

  colorMap: { [key: string]: string } = {
    'Bleu clair': '#7EC0EE',
    'Bleu foncé': '#1E90FF',
    Blanc: '#FFFFFF',
    'Gris clair': '#D3D3D3',
    'Gris foncé': '#A9A9A9',
    Beige: '#F5F5DC',
    Sable: '#F4A460',
    Vert: '#90EE90',
    Rouge: '#FF6347',
    Noir: '#000000',
    Marron: '#A0522D',
  };

  regions = [
    'Tunis',
    'Sfax',
    'Sousse',
    'Nabeul',
    'Bizerte',
    'Gabès',
    'Ariana',
    'Autre',
  ];
  submissionAttempted = false;
  backendError = '';

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private authService: AuthService,
    private authStateservice: AuthStateService,
    private router: Router,
    private toastService: ToastService,
    private commandeService: CommandeService,
    private bassinService: BassinService
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/checkout' },
      });
      return;
    }
    this.validateTokenAndLoadData();
  }

  private initForms(): void {
    this.clientInfoForm = this.fb.group({
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        ],
      ],
      phone: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    });

    this.checkoutForm = this.fb.group({
      adresseLivraison: ['', [Validators.required, Validators.maxLength(200)]],
      codePostal: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
      ville: ['', [Validators.required, Validators.maxLength(50)]],
      region: ['', [Validators.required]],
      modeLivraison: ['STANDARD', [Validators.required]],
      commentaires: ['', [Validators.maxLength(500)]],
    });
  }



  private loadData(): void {
    this.isLoading = true;
    this.cartService.getCartItems().subscribe({
      next: (items: PanierItem[]) => {
        this.cartItems = items.map((item) => ({
          ...item,
          status: item.status ?? 'DISPONIBLE',
          bassinId: item.bassinId ?? null,
        }));
        if (this.cartItems.length === 0) {
          this.toastService.showError('Votre panier est vide');
          this.router.navigate(['/cart']);
          return;
        }

        console.log('Loaded cart items:', JSON.stringify(this.cartItems, null, 2));
        this.cartItems.forEach((item, index) => {
          if (!item.bassinId) {
            console.warn(`Cart item at index ${index} is missing bassinId`, item);
          }
        });

        const customBassinIds = this.cartItems
          .filter((item) => item.isCustomized)
          .map((item) => item.bassinId)
          .filter((id): id is number => id !== null && id !== undefined);

        if (customBassinIds.length > 0) {
          this.loadManufacturingTimes(customBassinIds);
        } else {
          this.calculateTotals();
          this.loadUserData();
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.showError('Erreur panier', err.message || 'Impossible de charger votre panier');
      },
    });
  }

  private loadManufacturingTimes(bassinIds: number[]): void {
    const requests = bassinIds.map((id) =>
      this.bassinService.getBassinDetails(id).subscribe({
        next: (bassin) => {
          const cartItem = this.cartItems.find((item) => item.bassinId === bassin.idBassin);
          if (cartItem) {
            cartItem.dureeFabrication = bassin.dureeFabricationDisplay || '7';
          }
        },
        error: (err: any) => {
          console.error(`Error loading manufacturing time for bassin ${id}:`, err);
        },
      })
    );

    setTimeout(() => {
      this.calculateTotals();
      this.loadUserData();
    }, 500);
  }

 

  private patchUserData(user: User): void {
    let phoneNumber = user.phone || '';
    if (phoneNumber.startsWith('+')) {
      phoneNumber = phoneNumber.replace(/\D/g, '');
      if (phoneNumber.startsWith('216')) {
        phoneNumber = phoneNumber.substring(3);
      }
    }

    let email = user.email || '';
    if (email && !email.includes('@')) {
      email = `contact@${email}`;
    }

    this.clientInfoForm.patchValue({
      lastName: user.lastName || '',
      firstName: user.firstName || '',
      email: email,
      phone: phoneNumber,
    });

    if (user.defaultAddress) {
      const addressParts = user.defaultAddress.split(',');
      if (addressParts.length >= 3) {
        let codePostal = addressParts[1].trim().split(' ')[0];
        if (codePostal.length === 5) {
          codePostal = codePostal.substring(0, 4);
        }

        this.checkoutForm.patchValue({
          adresseLivraison: addressParts[0].trim(),
          codePostal: codePostal,
          ville: addressParts[1].trim().split(' ').slice(1).join(' '),
          region: addressParts[2].trim() || 'Tunis',
        });
      }
    }
  }

  calculateTotals(): void {
    this.subtotal = this.cartItems.reduce(
      (total, item) => total + item.effectivePrice * item.quantity,
      0
    );
    this.vatAmount = this.subtotal * this.vatRate;
    this.shippingCost = 20;
    this.total = this.subtotal + this.vatAmount + this.shippingCost;
  }

  onSubmitClientInfo(): void {
    this.submissionAttempted = true;

    const phoneControl = this.clientInfoForm.get('phone');
    if (phoneControl && phoneControl.value) {
      const cleanedPhone = phoneControl.value.toString().replace(/\D/g, '');
      const tunisianPhone = cleanedPhone.length > 8 ? cleanedPhone.slice(-8) : cleanedPhone;
      phoneControl.setValue(tunisianPhone);
    }

    if (this.clientInfoForm.invalid) {
      this.markFormGroupTouched(this.clientInfoForm);

      const invalidFields: string[] = [];
      if (this.clientInfoForm.get('lastName')?.invalid) invalidFields.push('Nom');
      if (this.clientInfoForm.get('firstName')?.invalid) invalidFields.push('Prénom');
      if (this.clientInfoForm.get('email')?.invalid) invalidFields.push('Email');
      if (this.clientInfoForm.get('phone')?.invalid) invalidFields.push('Téléphone');

      const errorMessage = invalidFields.length === 1
        ? `Le champ ${invalidFields[0]} est invalide ou incomplet.`
        : `Les champs suivants sont invalides ou incomplets : ${invalidFields.join(', ')}.`;

      this.showError('Informations incomplètes', errorMessage);
      return;
    }

    const hasCustomBassin = this.cartItems.some(
      (item) => item.isCustomized || item.status === 'SUR_COMMANDE'
    );
    this.currentStep = hasCustomBassin ? 'bassin-details' : 'delivery';
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onSubmitBassinDetails(): void {
    this.currentStep = 'delivery';
  }

  onSubmitDelivery(): void {
    this.submissionAttempted = true;
    this.backendError = '';

    if (this.checkoutForm.invalid) {
      this.markFormGroupTouched(this.checkoutForm);

      const invalidFields: string[] = [];
      if (this.checkoutForm.get('adresseLivraison')?.invalid) invalidFields.push('Adresse');
      if (this.checkoutForm.get('codePostal')?.invalid) invalidFields.push('Code postal');
      if (this.checkoutForm.get('ville')?.invalid) invalidFields.push('Ville');
      if (this.checkoutForm.get('region')?.invalid) invalidFields.push('Région');

      const errorMessage = invalidFields.length === 1
        ? `Le champ ${invalidFields[0]} est invalide ou incomplet.`
        : `Les champs suivants sont invalides ou incomplets : ${invalidFields.join(', ')}.`;

      this.showError('Informations incomplètes', errorMessage);
      return;
    }

    this.isLoading = true;
    this.createOrderAndProceedToPayment();
  }

private createOrderAndProceedToPayment(): void {
  if (!this.validateCheckoutPreconditions()) {
    return;
  }

  this.showProcessingLoader();

  const commandeRequest = this.buildCommandeRequest();

  this.commandeService
    .creerCommande(commandeRequest)
    .pipe(
      finalize(() => this.cleanupLoadingState()),
      catchError((err: HttpErrorResponse) => {
        this.handleOrderError(err);
        return of(null);
      })
    )
    .subscribe({
      next: (response) => {
        if (response && response.numeroCommande) {
          // Store numeroCommande for cancellation if payment fails
          sessionStorage.setItem('pendingCommandeNumero', response.numeroCommande);
          this.handleOrderSuccess(response, commandeRequest.clientId);
        } else {
          this.showError('Erreur', 'Réponse du serveur invalide ou numéro de commande manquant');
        }
      },
    });
}

  private validateCheckoutPreconditions(): boolean {
    if (!this.userData?.user_id) {
      this.isLoading = false;
      this.showError('Erreur', 'Utilisateur non identifié. Veuillez vous reconnecter.');
      this.authService.logout();
      this.router.navigate(['/login']);
      return false;
    }

    if (this.cartItems.length === 0) {
      this.isLoading = false;
      this.showError('Panier vide', 'Votre panier est vide. Veuillez ajouter des produits.');
      this.router.navigate(['/cart']);
      return false;
    }

    return true;
  }

  private showProcessingLoader(): void {
    this.isLoading = true;
    Swal.fire({
      title: 'Traitement en cours',
      html: 'Création de votre commande...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      backdrop: true,
    });
  }

// checkout.component.ts
private buildCommandeRequest(): CreationCommandeRequest {
  const currentUser = this.authStateservice.getCurrentUser();
  if (!currentUser?.user_id) {
    throw new Error('ID utilisateur manquant - impossible de créer la commande');
  }

  const clientId = Number(currentUser.user_id);
  if (isNaN(clientId) || clientId <= 0) {
    throw new Error('ID utilisateur invalide');
  }

  const clientNom = this.getFormValue('lastName').trim();
  const clientPrenom = this.getFormValue('firstName').trim();
  let clientEmail = this.getFormValue('email').trim();
  const clientTelephone = this.getFormValue('phone').trim();
  const adresseLivraison = this.getFormValue('adresseLivraison').trim();
  const codePostal = this.getFormValue('codePostal').trim();
  const ville = this.getFormValue('ville').trim();
  const region = this.getFormValue('region').trim();
  const modeLivraison = this.getFormValue('modeLivraison', 'STANDARD').trim();
  const commentaires = this.getFormValue('commentaires', '').trim();

  // Ensure email format is valid
  if (!clientEmail.includes('@')) {
    clientEmail = `${clientEmail}@example.com`; // Fallback for invalid email
  }

  // Frontend validations matching backend
  if (!clientNom) throw new Error('Le nom du client est requis');
  if (!clientPrenom) throw new Error('Le prénom du client est requis');
  if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    throw new Error("L'email du client est invalide");
  }
  if (!clientTelephone || !/^\d{8}$/.test(clientTelephone)) {
    throw new Error('Le téléphone doit contenir exactement 8 chiffres');
  }
  if (!adresseLivraison) throw new Error("L'adresse de livraison est requise");
  if (!codePostal || !/^\d{4}$/.test(codePostal)) {
    throw new Error('Le code postal doit contenir exactement 4 chiffres');
  }
  if (!ville) throw new Error('La ville est requise');
  if (!region) throw new Error('La région est requise');

  const items: PanierItemDTO[] = this.cartItems
    .filter((item) => item && item.bassinId)
    .map((item) => this.mapCartItemToDTO(item));

  if (items.length === 0) {
    throw new Error('Le panier ne contient aucun article valide');
  }

  // Convert cart ID to number or null
  const cartId = this.cartService.getCurrentCartId();
  const panierId = cartId && !isNaN(Number(cartId)) && Number(cartId) > 0 ? Number(cartId) : null;
  if (cartId && panierId === null) {
    console.warn('Invalid cart ID, set panierId to null:', cartId);
  }

  const request: CreationCommandeRequest = {
    clientId,
    panierId,
    clientNom,
    clientPrenom,
    clientEmail,
    clientTelephone,
    adresseLivraison,
    codePostal,
    ville,
    region,
    modeLivraison,
    commentaires: commentaires || null,
    items,
  };

  console.log('Commande request payload:', JSON.stringify(request, null, 2));
  return request;
}

private validateTokenAndLoadData(): void {
  // Vérifier d'abord l'état d'authentification via AuthStateService
  if (!this.authStateservice.isLoggedIn) {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/checkout' },
    });
    return;
  }

  // Ensuite vérifier le token via AuthService
  const token = this.authService.getToken();
  if (!token) {
    this.showError('Erreur', 'Session expirée. Veuillez vous reconnecter.');
    this.authService.logout();
    this.router.navigate(['/login']);
    return;
  }

  const currentUser = this.authStateservice.getCurrentUser();
  if (!currentUser?.user_id) {
    console.error('Current user data missing, attempting token refresh...');
    this.handleMissingUserData();
    return;
  }

  this.userData = currentUser;
  this.loadData();
}

private handleMissingUserData(): void {
  this.authService.refreshToken().pipe(
    catchError(err => {
      this.showError('Erreur', 'Session invalide. Veuillez vous reconnecter.');
      this.authService.logout();
      this.router.navigate(['/login']);
      return throwError(() => err);
    })
  ).subscribe({
    next: (response: { token: string } | string) => { // Définir explicitement le type
      // Gérer le cas où la réponse est directement le token string
      const token = typeof response === 'string' ? response : response?.token;
      
      if (token) {
        const user = this.authStateservice.extractUserFromToken(token);
        if (user?.user_id) {
          this.userData = user;
          this.loadData();
        } else {
          throw new Error('Invalid user data in token');
        }
      } else {
        throw new Error('No token received');
      }
    },
    error: (err) => {
      console.error('Token refresh failed:', err);
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  });
}

private loadUserData(): void {
  const currentUser = this.authStateservice.getCurrentUser();
  if (!currentUser || !currentUser.user_id) {
    this.isLoading = false;
    this.showError('Erreur', 'Données utilisateur invalides. Veuillez vous reconnecter.');
    this.authService.logout();
    this.router.navigate(['/login']);
    return;
  }

  this.userData = currentUser;
  this.patchUserData(currentUser);
  this.isLoading = false;
}

  private getFormValue(controlName: string, defaultValue: string = ''): string {
    const control = this.clientInfoForm.get(controlName) || this.checkoutForm.get(controlName);
    return control?.value !== undefined && control?.value !== null
      ? String(control.value)
      : defaultValue;
  }

private handleOrderSuccess(response: CommandeResponse | any, clientId: number): void {
  // Check if response is valid and has at least an ID
  if (!response?.id) {
    console.error('Invalid server response:', response);
    throw new Error('Réponse du serveur invalide');
  }

  // Extract key information from the response object
  const commandeId = response.id;
  const commandeNumero = response.numeroCommande;
  
  if (!commandeNumero) {
    console.error('Missing order number in response:', response);
    throw new Error('Numéro de commande manquant dans la réponse');
  }
  
  // Store order number for potential cancellation
  sessionStorage.setItem('pendingCommandeNumero', commandeNumero);
  
  const paymentData = this.buildPaymentData(response, clientId);
  
  // Store data temporarily
  sessionStorage.setItem('pendingPayment', JSON.stringify({
    commandeNumero: commandeNumero,
    expiresAt: Date.now() + 1800000 // 30 minutes
  }));

  // Navigation with state and fallback
  this.router.navigate(['/payment/card'], { 
    state: { paymentData },
    replaceUrl: true 
  }).catch(err => {
    console.error('Navigation failed, using fallback:', err);
    this.router.navigate(['/payment/card'], {
      queryParams: { 
        commandeNumero: commandeNumero,
        fallback: 'true'
      }
    });
  });

  this.showSuccessNotification();
}

  private buildPaymentData(response: CommandeResponse | any, clientId: number): any {
  return {
    commandeId: response.id?.toString(),
    commandeNumero: response.numeroCommande,
    totalAmount: this.total,
    clientInfo: {
      id: clientId,
      email: this.clientInfoForm.get('email')?.value || '',
      firstName: this.clientInfoForm.get('firstName')?.value || '',
      lastName: this.clientInfoForm.get('lastName')?.value || '',
      phone: this.clientInfoForm.get('phone')?.value || '',
    },
    cartItems: this.cartItems.map((item) => this.mapCartItemToDTO(item)),
    deliveryInfo: {
      adresseLivraison: this.checkoutForm.get('adresseLivraison')?.value || '',
      codePostal: this.checkoutForm.get('codePostal')?.value || '',
      ville: this.checkoutForm.get('ville')?.value || '',
      region: this.checkoutForm.get('region')?.value || '',
      commentaires: this.checkoutForm.get('commentaires')?.value || '',
      modeLivraison: this.checkoutForm.get('modeLivraison')?.value || 'STANDARD',
    },
    orderDetails: {
      subtotal: this.subtotal,
      vatAmount: this.vatAmount,
      shippingCost: this.shippingCost,
      total: this.total,
    },
  };
}

  private persistPaymentData(paymentData: any): void {
    try {
      sessionStorage.setItem('currentPaymentData', JSON.stringify(paymentData));
      localStorage.setItem('lastSuccessfulOrder', JSON.stringify(paymentData));
    } catch (e) {
      console.error('Erreur de stockage:', e);
    }
  }

  private navigateToPayment(paymentData: any): void {
    this.router
      .navigate(['/payment/card'], {
        state: { paymentData },
        replaceUrl: true,
      })
      .catch((err) => {
        console.error('Échec de navigation:', err);
        this.router.navigate(['/payment/card'], {
          queryParams: { fallback: 'true' },
        });
      });
  }

  private showSuccessNotification(): void {
    Swal.fire({
      title: 'Succès!',
      text: 'Votre commande a été créée',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true,
    });
  }

  private handleOrderError(err: any): void {
    const errorMessage = this.extractErrorMessage(err);
    console.error('Erreur création commande:', err);

    Swal.fire({
      title: 'Erreur',
      html: `<p>${errorMessage}</p>`,
      icon: 'error',
      willClose: () => {
        this.router.navigate(['/checkout']);
      },
    });
  }

  private extractErrorMessage(err: any): string {
    if (err?.error?.userMessage) {
      return err.error.userMessage;
    }
    if (err?.error?.message) {
      return err.error.message;
    }
    if (err?.message) {
      return err.message;
    }
    return 'Une erreur inattendue est survenue. Veuillez réessayer.';
  }

  private cleanupLoadingState(): void {
    this.isLoading = false;
    Swal.close();
  }

  private handleOrderCreationError(error: HttpErrorResponse): Error {
    console.error('Erreur création commande:', error);

    let errorMessage = 'Erreur lors de la création de la commande';

    if (error.status === 0) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
    } else if (error.status === 400) {
      errorMessage = error.error?.message || 'Données de commande invalides';
    } else if (error.status === 401) {
      errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      this.authService.logout();
      this.router.navigate(['/login']);
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    this.backendError = error.status.toString();
    return new Error(errorMessage);
  }

  private showSuccessAndRedirect(message: string, redirectTo: string): void {
    Swal.fire({
      title: 'Succès!',
      text: message,
      icon: 'success',
      showConfirmButton: true,
      confirmButtonText: 'OK',
      timer: 3000,
      timerProgressBar: true,
      willClose: () => {
        this.router.navigate([redirectTo]);
      },
    });
  }

  showError(title: string, message: string): void {
    Swal.fire({
      title,
      text: message,
      icon: 'error',
      confirmButtonText: 'OK',
    });
  }

  private mapCartItemToDTO(item: PanierItem): PanierItemDTO {
    if (!item?.bassinId) {
      throw new Error(`Cart item is missing bassinId: ${JSON.stringify(item)}`);
    }

    const isCustomized = item.isCustomized || false;
    const status = isCustomized ? 'SUR_COMMANDE' : (item.status ?? 'DISPONIBLE');

    const truncateString = (
      value: string | undefined | null,
      maxLength: number = 255
    ): string | null => {
      if (value == null) return null;
      if (value.length > maxLength) {
        console.warn(`Truncating string to ${maxLength} characters: ${value}`);
        return value.substring(0, maxLength);
      }
      return value;
    };

    const prixUnitaire = item.effectivePrice || item.prixOriginal || 0;
    const quantity = item.quantity || 1;

    if (prixUnitaire < 0) {
      throw new Error(`Invalid prixUnitaire for item ${item.nomBassin}: ${prixUnitaire}`);
    }
    if (quantity <= 0) {
      throw new Error(`Invalid quantity for item ${item.nomBassin}: ${quantity}`);
    }

    const prixAccessoires =
      item.prixAccessoires ??
      item.accessoires?.reduce((sum, acc) => sum + (acc.prixAccessoire || 0), 0) ??
      0;

    const dto: PanierItemDTO = {
      bassinId: item.bassinId,
      nomBassin: truncateString(item.nomBassin || item.bassin?.nomBassin || 'Bassin sans nom') || 'Bassin sans nom',
      description: truncateString(item.description),
      imageUrl: truncateString(
        item.imageUrl ||
          item.bassin?.imagesBassin?.[0]?.imagePath ||
          'assets/default-image.webp'
      ),
      quantity,
      prixUnitaire,
      prixTotal: prixUnitaire * quantity,
      isCustomized,
      status,
      materiauSelectionne: truncateString(item.customization?.materiauSelectionne),
      prixMateriau: item.customization?.prixMateriau ?? null,
      dimensionSelectionnee: truncateString(item.customization?.dimensionSelectionnee),
      prixDimension: item.customization?.prixDimension ?? null,
      couleurSelectionnee: truncateString(item.customization?.couleurSelectionnee),
      delaiFabrication: truncateString(
        item.dureeFabrication || (isCustomized ? '15 jours' : null)
      ),
      prixAccessoires,
      accessoires:
        item.accessoires?.map((acc) => ({
          accessoireId: acc.idAccessoire || 0,
          nomAccessoire: truncateString(acc.nomAccessoire || 'Accessoire sans nom') || 'Accessoire sans nom',
          prixAccessoire: acc.prixAccessoire || 0,
          imageUrl: truncateString(acc.imageUrl || 'assets/default-accessoire.webp'),
        })) || [],
    };

    console.log(`Mapped PanierItemDTO for bassinId ${item.bassinId}:`, JSON.stringify(dto, null, 2));
    return dto;
  }

  getBassinStatusLabel(status: string): string {
    switch (status) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'SUR_COMMANDE':
        return 'Sur commande';
      case 'RUPTURE_STOCK':
        return 'Rupture de stock';
      default:
        return 'Disponible';
    }
  }

  hasCustomOrSpecialOrderItems(): boolean {
    return this.cartItems.some(
      (item) => item.isCustomized || item.status === 'SUR_COMMANDE'
    );
  }

  getDeliveryStepNumber(): string {
    return this.hasCustomOrSpecialOrderItems() ? '3' : '2';
  }

  goBack(): void {
    switch (this.currentStep) {
      case 'delivery':
        this.currentStep = this.hasCustomOrSpecialOrderItems() ? 'bassin-details' : 'info';
        break;
      case 'bassin-details':
        this.currentStep = 'info';
        break;
      default:
        break;
    }
  }

  checkBackendStatus(): void {
    this.commandeService.checkBackendStatus().subscribe({
      next: () => {
        this.createOrderAndProceedToPayment();
      },
      error: (err) => {
        this.showError(
          'Service indisponible',
          'Le service de commandes est actuellement indisponible. Veuillez réessayer plus tard.'
        );
        this.isLoading = false;
      },
    });
  }

  getColorPreview(color: string | undefined): string {
    if (!color) return '#CCCCCC';
    const mappedColor = this.colorMap[color];
    if (mappedColor) return mappedColor;
    if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
      return color;
    }
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      if (ctx.fillStyle !== color) {
        return ctx.fillStyle;
      }
    }
    return '#CCCCCC';
  }

  onImageError(event: any): void {
    event.target.src = 'assets/default-image.webp';
  }

  getImageUrl(item: PanierItem): string {
    if (!item) return 'assets/default-image.webp';
    if (item.isCustomized && item.customProperties?.imageUrl) {
      return item.customProperties.imageUrl;
    }
    if (
      item.bassin &&
      item.bassin.imagesBassin &&
      item.bassin.imagesBassin.length > 0
    ) {
      const firstImage = item.bassin.imagesBassin[0];
      if (firstImage && firstImage.imagePath) {
        return `${this.bassinService.getApiUrl()}/imagesBassin/getFS/${encodeURIComponent(
          firstImage.imagePath
        )}`;
      }
    }
    return item.isCustomized ? 'assets/default-image.webp' : 'assets/default-image.webp';
  }

  getItemName(item: PanierItem): string {
    if (item.isCustomized) {
      return item.customProperties?.bassinBase?.nom
        ? `${item.customProperties.bassinBase.nom} (Personnalisé)`
        : 'Bassin personnalisé';
    }
    return item.bassin?.nomBassin || item.nomBassin || 'Bassin';
  }

  @HostListener('window:beforeunload', ['$event'])
handleBeforeUnload(event: BeforeUnloadEvent): string | undefined {
  if (this.currentStep !== 'info') {
    event.preventDefault();
    return 'Vous avez une commande en cours. Voulez-vous vraiment quitter?';
  }
  return undefined;
}
}