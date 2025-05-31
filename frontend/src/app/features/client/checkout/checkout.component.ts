import { Component, OnInit, HostListener } from '@angular/core';
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
import { AuthStateService } from '../../../core/services/auth-state.service';
import { of, switchMap, finalize, catchError, forkJoin, Observable, map } from 'rxjs';
import { CommandeResponse, CreationCommandeRequest, PanierItemDTO } from '../../../core/models/commande.models';
import { HttpErrorResponse } from '@angular/common/http';

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
  shippingCost = 20;
  currentStep = 'info';
  userData: User | null = null;

  regions = [
    'Gouvernorat de l\'Ariana',
    'Gouvernorat de Béja',
    'Gouvernorat de Ben Arous',
    'Gouvernorat de Bizerte',
    'Gouvernorat de Gabès',
    'Gouvernorat de Gafsa',
    'Gouvernorat de Jendouba',
    'Gouvernorat de Kairouan',
    'Gouvernorat de Kasserine',
    'Gouvernorat de Kébili',
    'Gouvernorat du Kef',
    'Gouvernorat de Mahdia',
    'Gouvernorat de Manouba',
    'Gouvernorat de Médenine',
    'Gouvernorat de Monastir',
    'Gouvernorat de Nabeul',
    'Gouvernorat de Sfax',
    'Gouvernorat de Sidi Bouzid',
    'Gouvernorat de Siliana',
    'Gouvernorat de Sousse',
    'Gouvernorat de Tataouine',
    'Gouvernorat de Tozeur',
    'Gouvernorat de Tunis',
    'Gouvernorat de Zaghouan',
  ];

  submissionAttempted = false;
  backendError = '';

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private authService: AuthService,
    private authStateservice: AuthStateService,
    public router: Router,
    private toastService: ToastService,
    private commandeService: CommandeService,
    private bassinService: BassinService
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    this.validateTokenAndLoadData();
    this.setupRealTimeValidation();
  }

  private initForms(): void {
    this.clientInfoForm = this.fb.group({
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]],
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

  private setupRealTimeValidation(): void {
    this.clientInfoForm.valueChanges.subscribe(() => {
      this.submissionAttempted = false;
    });

    this.checkoutForm.valueChanges.subscribe(() => {
      this.submissionAttempted = false;
    });
  }

private loadData(): void {
    this.isLoading = true;
    this.cartService.getCartItems().pipe(
        switchMap((items: PanierItem[]) => {
            this.cartItems = items.map(item => ({
                ...item,
                status: item.status ?? 'DISPONIBLE',
                bassinId: item.bassinId ?? null
            }));

            if (this.cartItems.length === 0) {
                this.toastService.showError('Votre panier est vide');
                this.router.navigate(['/cart']);
                return of([] as PanierItem[]);
            }

            // For each item, get its current status
            const statusChecks: Observable<PanierItem>[] = this.cartItems.map(item => {
                if (!item.bassinId) return of(item);
                
                return this.bassinService.getBassinStatus(item.bassinId).pipe(
                    map(status => ({
                        ...item,
                        status: item.isCustomized ? 'SUR_COMMANDE' : (status === 'DISPONIBLE' || status === 'SUR_COMMANDE' || status === 'RUPTURE_STOCK' ? status : 'DISPONIBLE') as 'DISPONIBLE' | 'SUR_COMMANDE' | 'RUPTURE_STOCK'
                    } as PanierItem)),
                    catchError(() => of({
                        ...item,
                        status: 'RUPTURE_STOCK' as 'DISPONIBLE' | 'SUR_COMMANDE' | 'RUPTURE_STOCK'
                    } as PanierItem))
                );
            });

            return forkJoin(statusChecks);
        })
    ).subscribe({
        next: (updatedItems: PanierItem[]) => {
            if (updatedItems.length === 0) return;
            
            this.cartItems = updatedItems;
            
            const customBassinIds = this.cartItems
                .filter(item => item.isCustomized)
                .map(item => item.bassinId)
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
        }
    });
}

  private loadManufacturingTimes(bassinIds: number[]): void {
    bassinIds.forEach((id) => {
      this.bassinService.getBassinDetails(id).subscribe({
        next: (bassin) => {
          const cartItem = this.cartItems.find((item) => item.bassinId === bassin.idBassin);
          if (cartItem) {
            cartItem.dureeFabrication = bassin.dureeFabricationDisplay || '7 jours';
          }
        },
        error: (err: any) => {
          console.error(`Error loading manufacturing time for bassin ${id}:`, err);
        },
      });
    });

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
          region: addressParts[2].trim() || 'Gouvernorat de Tunis',
        });
      }
    }
  }

  calculateTotals(): void {
    this.subtotal = this.cartItems.reduce(
      (total, item) => total + (item.effectivePrice || item.prixOriginal || 0) * (item.quantity || 1),
      0
    );
    this.vatAmount = this.subtotal * this.vatRate;
    this.total = this.subtotal + this.vatAmount + this.shippingCost;
  }

  onSubmitClientInfo(): void {
    this.submissionAttempted = true;
    if (this.clientInfoForm.invalid) {
      this.markFormGroupTouched(this.clientInfoForm);
      this.showError('Informations incomplètes', 'Veuillez remplir correctement tous les champs obligatoires.');
      return;
    }
    this.currentStep = 'delivery';
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onSubmitDelivery(): void {
    this.submissionAttempted = true;
    if (this.checkoutForm.invalid) {
      this.markFormGroupTouched(this.checkoutForm);
      this.showError('Informations incomplètes', 'Veuillez remplir correctement tous les champs obligatoires.');
      return;
    }
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
          this.handleErrorResponse(err);
          return of(null);
        })
      )
      .subscribe({
        next: (response: CommandeResponse | null) => {
          if (response && response.id && response.numeroCommande) {
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

    if (!clientEmail.includes('@')) {
      clientEmail = `${clientEmail}@example.com`;
    }

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

    const cartId = this.cartService.getCurrentCartId();
    const panierId = cartId && !isNaN(Number(cartId)) && Number(cartId) > 0 ? Number(cartId) : null;

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

    return request;
  }

  private validateTokenAndLoadData(): void {
    if (!this.authStateservice.isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.showError('Erreur', 'Session expirée. Veuillez vous reconnecter.');
      this.authService.logout();
      this.router.navigate(['/login']);
      return;
    }

    const currentUser = this.authStateservice.getCurrentUser();
    if (!currentUser?.user_id) {
      this.handleMissingUserData();
      return;
    }

    this.userData = currentUser;
    this.loadData();
  }

  private handleMissingUserData(): void {
    this.authService.refreshToken().pipe(
      catchError((err) => {
        this.showError('Erreur', 'Session invalide. Veuillez vous reconnecter.');
        this.authService.logout();
        this.router.navigate(['/login']);
        return of(null);
      })
    ).subscribe({
      next: (response: { token: string } | string | null) => {
        if (!response) {
          this.showError('Erreur', 'Impossible de rafraîchir la session. Veuillez vous reconnecter.');
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }
        const token = typeof response === 'string' ? response : response?.token;
        if (token) {
          const user = this.authStateservice.extractUserFromToken(token);
          if (user?.user_id) {
            this.userData = user;
            this.loadData();
          } else {
            this.showError('Erreur', 'Données utilisateur invalides dans le jeton.');
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        } else {
          this.showError('Erreur', 'Aucun jeton reçu.');
          this.authService.logout();
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        console.error('Token refresh failed:', err);
        this.showError('Erreur', 'Échec du rafraîchissement du jeton. Veuillez vous reconnecter.');
        this.authService.logout();
        this.router.navigate(['/login']);
      },
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
    return control?.value !== undefined && control?.value !== null ? String(control.value) : defaultValue;
  }

private handleOrderSuccess(response: CommandeResponse, clientId: number): void {
    if (!response?.id || !response?.numeroCommande) {
      console.error('Invalid server response:', response);
      this.showError('Erreur', 'Réponse du serveur invalide ou numéro de commande manquant');
      return;
    }

    // Convertir l'ID en string pour le stockage
    const commandeId = response.id.toString();
    const commandeNumero = response.numeroCommande;

    sessionStorage.setItem('pendingCommandeNumero', commandeNumero);
    sessionStorage.setItem('pendingCommandeId', commandeId);

    const paymentData = this.buildPaymentData(response, clientId);

    sessionStorage.setItem('pendingPayment', JSON.stringify({
      commandeId,
      commandeNumero,
      expiresAt: Date.now() + 1800000 // 30 minutes
    }));

    this.router.navigate(['/payment/card'], {
      state: { paymentData, commandeId, commandeNumero },
      replaceUrl: true
    }).catch((err) => {
      console.error('Navigation failed:', err);
      this.router.navigate(['/payment/card'], {
        queryParams: { commandeId, commandeNumero, fallback: 'true' }
      });
    });

    this.showSuccessNotification();
}

  private buildPaymentData(response: CommandeResponse, clientId: number): any {
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

  private showSuccessNotification(): void {
    Swal.fire({
      title: 'Succès!',
      text: 'Votre commande a été créée avec succès. Vous serez redirigé vers le paiement.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true,
    });
  }

  private handleErrorResponse(err: HttpErrorResponse): void {
    const errorMessage = this.extractErrorMessage(err);
    console.error('Erreur création commande:', err);

    Swal.fire({
      title: 'Erreur',
      html: `<p>${errorMessage}</p>`,
      icon: 'error',
      confirmButtonText: 'OK',
      confirmButtonColor: '#005f7a',
    });
  }

  private extractErrorMessage(err: any): string {
    if (err?.error?.userMessage) return err.error.userMessage;
    if (err?.error?.message) return err.error.message;
    if (err?.message) return err.message;
    return 'Une erreur inattendue est survenue. Veuillez réessayer.';
  }

  private cleanupLoadingState(): void {
    this.isLoading = false;
    Swal.close();
  }

private mapCartItemToDTO(item: PanierItem): PanierItemDTO {
    if (!item?.bassinId) {
      throw new Error(`Cart item is missing bassinId: ${JSON.stringify(item)}`);
    }
 const status: 'DISPONIBLE' | 'SUR_COMMANDE' | 'RUPTURE_STOCK' = 
        item.isCustomized ? 'SUR_COMMANDE' : (item.status ?? 'DISPONIBLE');

    // Force status to SUR_COMMANDE for customized items
    const isCustomized = item.isCustomized || false;

    const truncateString = (value: string | undefined | null, maxLength: number = 255): string | null => {
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

    const prixAccessoires = item.prixAccessoires ?? item.accessoires?.reduce((sum, acc) => sum + (acc.prixAccessoire || 0), 0) ?? 0;

    const dto: PanierItemDTO = {
      bassinId: item.bassinId,
      nomBassin: truncateString(item.nomBassin || item.bassin?.nomBassin || 'Bassin sans nom') || 'Bassin sans nom',
      description: truncateString(item.description),
      imageUrl: truncateString(item.imageUrl || item.bassin?.imagesBassin?.[0]?.imagePath || 'assets/default-image.webp'),
      quantity,
      prixUnitaire,
      prixTotal: prixUnitaire * quantity,
      isCustomized,
      status, // This now properly sets SUR_COMMANDE for customized items
      materiauSelectionne: truncateString(item.customization?.materiauSelectionne),
      prixMateriau: item.customization?.prixMateriau ?? null,
      dimensionSelectionnee: truncateString(item.customization?.dimensionSelectionnee),
      prixDimension: item.customization?.prixDimension ?? null,
      couleurSelectionnee: truncateString(item.customization?.couleurSelectionnee),
      delaiFabrication: truncateString(item.dureeFabrication || (isCustomized ? '15 jours' : null)),
      prixAccessoires,
      accessoires: item.accessoires?.map((acc) => ({
        accessoireId: acc.idAccessoire || 0,
        nomAccessoire: truncateString(acc.nomAccessoire || 'Accessoire sans nom') || 'Accessoire sans nom',
        prixAccessoire: acc.prixAccessoire || 0,
        imageUrl: truncateString(acc.imageUrl || 'assets/default-accessoire.webp'),
      })) || [],
    };

    return dto;
  }

  getBassinStatusLabel(status: string): string {
    switch (status) {
      case 'DISPONIBLE': return 'Disponible';
      case 'SUR_COMMANDE': return 'Sur commande';
      case 'RUPTURE_STOCK': return 'Rupture de stock';
      default: return 'Disponible';
    }
  }

  hasCustomOrSpecialOrderItems(): boolean {
    return false;
  }

  getDeliveryStepNumber(): string {
    return '2';
  }

  goBack(): void {
    if (this.currentStep === 'delivery') {
      this.currentStep = 'info';
    }
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
        return `${
          this.bassinService.getApiUrl()
        }/imagesBassin/getFS/${encodeURIComponent(firstImage.imagePath)}`;
      }
    }

    return 'assets/default-image.webp';
  }

  logItemDetails(item: PanierItem): void {
    console.log('Item details:', {
      id: item.id,
      name: item.nomBassin || item.bassin?.nomBassin,
      isCustomized: item.isCustomized,
      bassin: item.bassin,
      customProperties: item.customProperties,
      imageUrl: this.getImageUrl(item),
      fabricationDuration: this.getFabricationDuration(item),
    });
  }

  getFabricationDuration(item: PanierItem): string {
    if (item.isCustomized && item.customProperties?.dureeFabrication) {
      return `${item.customProperties.dureeFabrication} jours`;
    }

    if (!item.isCustomized && item.bassin) {
      if (item.bassin.dureeFabricationJours) {
        return `${item.bassin.dureeFabricationJours} jours`;
      }
      if (item.bassin.dureeFabricationJoursMin && item.bassin.dureeFabricationJoursMax) {
        return `${item.bassin.dureeFabricationJoursMin}-${item.bassin.dureeFabricationJoursMax} jours`;
      }
      return item.bassin.dureeFabricationDisplay || '3-15 jours';
    }

    return '3-15 jours';
  }

  getItemFullName(item: PanierItem): string {
    if (item.isCustomized) {
      const baseName = item.customProperties?.bassinBase?.nom || item.nomBassin || 'Bassin';
      return `${baseName} Personnalisé`;
    }
    return item.bassin?.nomBassin || item.nomBassin || 'Bassin';
  }

  getAccessoiresCount(item: PanierItem): number {
    return item.customProperties?.accessoires?.length || item.accessoires?.length || 0;
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): string | undefined {
    if (this.currentStep !== 'info' && (this.clientInfoForm.dirty || this.checkoutForm.dirty)) {
      event.preventDefault();
      return 'Vous avez des modifications non enregistrées dans votre commande. Voulez-vous vraiment quitter ?';
    }
    return undefined;
  }

  showError(title: string, message: string): void {
    Swal.fire({
      title,
      text: message,
      icon: 'error',
      confirmButtonText: 'OK',
      confirmButtonColor: '#005f7a',
    });
  }
  formatDimensions(dimensions: string | string[]): string {
    if (!dimensions) return 'Non spécifié';
    if (Array.isArray(dimensions)) return dimensions.join(' × ') + ' cm';
    return dimensions;
  }

  getEffectivePrice(item: PanierItem): number {
    if (item.isCustomized && item.customProperties?.prixEstime) {
      return item.customProperties.prixEstime;
    }

    if (!item.isCustomized && item.promotionActive && item.tauxReduction !== undefined) {
      return item.prixPromo ?? (item.prixOriginal ?? item.bassin?.prix ?? 0) * (1 - item.tauxReduction);
    }

    return item.prixOriginal ?? item.bassin?.prix ?? 0;
  }

  calculateDiscount(item: PanierItem): number {
    if (item.isCustomized || !item.promotionActive || !item.tauxReduction || !item.prixOriginal) {
      return 0;
    }
    return parseFloat((item.prixOriginal * item.tauxReduction * item.quantity).toFixed(2));
  }

  formatMateriaux(materiau: string | string[]): string {
    if (!materiau) return 'Non spécifié';
    if (Array.isArray(materiau)) return materiau.join(', ');
    return materiau;
  }

  getDiscountPercentage(item: PanierItem): number {
    if (item.isCustomized || !item.promotionActive || item.tauxReduction === undefined) {
      return 0;
    }
    return Math.round(item.tauxReduction * 100);
  }

  calculateSubtotal(item: PanierItem): number {
    return parseFloat((this.getEffectivePrice(item) * item.quantity).toFixed(2));
  }

  formatPrice(value: number): string {
    if (value == null) return '0,000';
    return value.toFixed(3).replace('.', ',') + ' TND';
  }
}