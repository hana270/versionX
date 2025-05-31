import { ImageBassin } from './../../../core/models/image.models';
import {
  Component,
  HostListener,
  OnInit,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
  OnDestroy,
  Input,
  ViewChild,
  ElementRef,
  NgZone,
  AfterViewInit,
} from '@angular/core';
import { AuthService } from '../../../core/authentication/auth.service';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  interval,
  Observable,
  of,
  Subject,
  Subscription,
  switchMap,
  takeUntil,
  throwError,
} from 'rxjs';
import { Bassin } from '../../../core/models/bassin.models';
import { BassinService } from '../../../core/services/bassin.service';
import { PanierItem, CustomProperties } from '../../../core/models/panier-item.model';
import { User } from '../../../core/models/user.model';
import Swal from 'sweetalert2';
import { Accessoire } from '../../../core/models/accessoire.models';
import { Panier } from '../../../core/models/panier.model';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit, OnDestroy,AfterViewInit {
    email = 'contact@acquatresor.com';
client: User | null = null;
  notificationsCount: number = 0;
  openNotifications() {
    throw new Error('Method not implemented.');
  }
  openChat() {
    throw new Error('Method not implemented.');
  }
  emptyCart = false;
  @Input() item!: PanierItem;
  isMenuOpen = false;
  isDropdownOpen = false;
  isCartOpen = false;
  isAuthenticated = false;
  isClient = false;
  cartItems: PanierItem[] = [];
  totalPrice = 0;
  favoritesCount = 0;
  isLoading = false;
  private updateSubject = new Subject<void>();
  private cartSubscription: Subscription | null = null;
  private authSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  isBrowser = true;
  private _cartItemCount = 0;
  @ViewChild('profileButton') profileButton!: ElementRef;
  @ViewChild('dropdownMenu') dropdownMenu!: ElementRef;
  uniqueBasinCount = 0;

  materiauxImages: { [key: string]: string } = {
    'Béton fibré': 'assets/images/materials/concrete.webp',
    'Acier inoxydable': 'assets/images/materials/stainless-steel.webp',
    'Bois composite': 'assets/images/materials/wood-composite.webp',
    'Béton fibré haute performance': 'assets/img/materiaux/beton.jpg',
    'Polyéthylène haute densité (PEHD)': 'assets/img/materiaux/pehd.jpg',
    'Composite verre-résine': 'assets/img/materiaux/composite.jpg',
    'Acier inoxydable 316L (marine)': 'assets/img/materiaux/acier.jpg',
    "Tôle d'acier galvanisé à chaud": 'assets/img/materiaux/tole.jpg',
    'PVC renforcé': 'assets/img/materiaux/PVC.jpg',
    'Membrane EPDM épaisseur 1.5mm': 'assets/img/materiaux/Membrane.jpg',
    'Géomembrane HDPE': 'assets/img/materiaux/Géomembrane.jpg',
    'Pierre reconstituée': 'assets/img/materiaux/pierre.jpg',
    'Fibre de carbone': 'assets/img/materiaux/fibre.jpg',
    'Bâche armée PVC 900g/m²': 'assets/img/materiaux/bache.jpg',
    'Polypropylène expansé': 'assets/img/materiaux/Polypropylène.jpg',
    'Béton polymère': 'assets/img/materiaux/Béton.jpg',
    'Aluminium anodisé': 'assets/img/materiaux/Aluminium.jpg',
    'Titane grade 2': 'assets/img/materiaux/titane.jpg',
    'Résine époxy renforcée': 'assets/img/materiaux/resine.jpg',
  };

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

  constructor(
    public authService: AuthService,
    public router: Router,
    private cartService: CartService,
    private favoritesService: FavoritesService,
    public toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private bassinService: BassinService,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.initializeAuthState();
    this.initializeSubscriptions();
    this.loadCartItems();
        this.loadUserData();

    if (this.isBrowser) {
      this.ngZone.runOutsideAngular(() => {
        interval(60000)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => this.ngZone.run(() => this.checkPromotions()));
      });
    }

    
  }

  private initializeAuthState(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    this.isClient = this.authService.isClient();
    if (this.isAuthenticated) {
      const user = this.authService.getCurrentUser();
      this.client = user;
      if (!user) {
        this.toastService.showError('Erreur lors du chargement des données utilisateur');
      }
      this.cdr.detectChanges();
    }
  }

  private initializeSubscriptions(): void {
    this.authSubscription = this.authService.isAuthenticated$
      .pipe(
        distinctUntilChanged(),
        switchMap((isAuth) => {
          if (isAuth) {
            const user = this.authService.getCurrentUser();
            this.client = user;
            if (!user) {
              this.toastService.showError('Erreur lors du chargement des données utilisateur');
            }
            this.cdr.detectChanges();
            return this.cartService.forceRefreshCart();
          } else {
            this.client = null;
            this.cdr.detectChanges();
            return this.cartService.getServerCart();
          }
        }),
        catchError((err) => {
          console.error('Error loading cart:', err);
          return of(this.cartService.getLocalCart());
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((panier: Panier) => {
        this.ngZone.run(() => {
          this.isAuthenticated = this.authService.isAuthenticated();
          this.isClient = this.authService.isClient();
          this.updateCartDisplay(panier);
        });
      });

    this.cartSubscription = this.cartService.cart$
      .pipe(
        distinctUntilChanged((prev, curr) => JSON.stringify(prev?.items) === JSON.stringify(curr?.items)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (panier) => this.ngZone.run(() => this.updateCartDisplay(panier)),
        error: (err) => {
          console.error('Cart subscription error:', err);
          this.ngZone.run(() => this.updateCartDisplay(this.cartService.getLocalCart()));
        },
      });
  }

  private loadCartItems(): void {
    if (!this.isBrowser && !this.isAuthenticated) return;
    this.isLoading = true;
    this.cartService
      .getCartItems()
      .pipe(
        catchError((err) => {
          console.error('Error loading cart items:', err);
          this.toastService.showError('Erreur lors du chargement du panier');
          return of([] as PanierItem[]);
        }),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((items) => {
        this.ngZone.run(() => {
          this.cartItems = items.map(item => this.mapCartItem(item));
          this.uniqueBasinCount = this.calculateUniqueBasinCount();
          this.totalPrice = this.calculateTotalPrice(this.cartItems);
          this.emptyCart = items.length === 0;
          this._cartItemCount = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
        });
      });
  }

  private updateCartDisplay(panier: Panier | null): void {
    if (!panier) {
      this.cartItems = [];
      this.uniqueBasinCount = 0;
      this.totalPrice = 0;
      this.emptyCart = true;
      this._cartItemCount = 0;
    } else {
      this.cartItems = (panier.items || []).map((item: any) => this.mapCartItem(item));
      this.uniqueBasinCount = this.calculateUniqueBasinCount();
      this.totalPrice = this.calculateTotalPrice(this.cartItems);
      this.emptyCart = this.cartItems.length === 0;
      this._cartItemCount = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
    }
    this.checkPromotions();
  }

logout(): void {
    if (!this.isBrowser) return;
    try {
      this.authService.logout(); // Synchronous call
      this.ngZone.run(() => {
        this.isAuthenticated = false;
        this.isClient = false;
        this.client = null;
        this.cartItems = [];
        this.uniqueBasinCount = 0;
        this.totalPrice = 0;
        this.emptyCart = true;
        this._cartItemCount = 0;
        this.isDropdownOpen = false;
        this.router.navigate(['/login']);
        this.toastService.showSuccess('Vous avez été déconnecté avec succès');
        this.cdr.detectChanges();
      });
    } catch (error: unknown) {
      console.error('Logout error:', error);
      this.ngZone.run(() => this.toastService.showError('Erreur lors de la déconnexion'));
    }
}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isBrowser) return;
    const profileBtn = this.profileButton?.nativeElement;
    const dropdown = this.dropdownMenu?.nativeElement;
    if (profileBtn && dropdown && !profileBtn.contains(event.target as Node) && !dropdown.contains(event.target as Node)) {
      this.ngZone.run(() => {
        this.isDropdownOpen = false;
      });
    }
  }



  private calculateUniqueBasinCount(): number {
    const uniqueBasins = new Set(this.cartItems.map((item) => item.bassinId || item.nomBassin || item.id));
    return uniqueBasins.size;
  }

  private checkPromotions(): void {
    const now = new Date();
    let needsUpdate = false;

    this.cartItems.forEach((item) => {
      if (item.bassin?.promotion) {
        const startDate = new Date(item.bassin.promotion.dateDebut);
        const endDate = new Date(item.bassin.promotion.dateFin);
        const isActive = now >= startDate && now <= endDate;

        if (isActive !== item.promotionActive) {
          item.promotionActive = isActive;
          item.tauxReduction = isActive ? item.bassin.promotion.tauxReduction : 0;
          item.effectivePrice = this.calculateEffectivePrice(item);
          needsUpdate = true;
        }
      }
    });

    if (needsUpdate) {
      this.totalPrice = this.calculateTotalPrice(this.cartItems);
      this.uniqueBasinCount = this.calculateUniqueBasinCount();
    }
  }

  private calculateTotalPrice(items: PanierItem[]): number {
    return items.reduce((total, item) => total + this.calculateEffectivePrice(item) * item.quantity, 0);
  }

  private calculateEffectivePrice(item: PanierItem): number {
    let basePrice = item.prixOriginal || 0;

    if (item.isCustomized) {
      basePrice +=
        (item.customization?.prixMateriau || 0) +
        (item.customization?.prixDimension || 0) +
        (item.prixAccessoires || 0);
    }

    return item.promotionActive && item.tauxReduction
      ? basePrice * (1 - item.tauxReduction)
      : basePrice;
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleCart(event: Event): void {
    if (!this.isBrowser) return;
    event.stopPropagation();
    this.isCartOpen = !this.isCartOpen;
  }

  goToCart(): void {
    if (!this.isBrowser) return;
    this.ngZone.run(() => {
      this.router.navigate(['/cart']);
      this.isCartOpen = false;
    });
  }

  get uniqueItemsCount(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  getBassinDetails(item: PanierItem): string {
    if (!item) return 'Aucun détail disponible';

    const details = [];
    if (item.isCustomized && item.customProperties) {
      details.push('Bassin personnalisé');
      if (item.customProperties.bassinBase?.nom) details.push(`Modèle: ${item.customProperties.bassinBase.nom}`);
      if (item.customProperties.dimensionSelectionnee) details.push(`Dimensions: ${item.customProperties.dimensionSelectionnee}`);
      if (item.customProperties.materiauSelectionne) details.push(`Matériau: ${item.customProperties.materiauSelectionne}`);
      if (item.customProperties.couleurSelectionnee) details.push(`Couleur: ${item.customProperties.couleurSelectionnee}`);
      if (item.customProperties.accessoires?.length) details.push(`Accessoires: ${item.customProperties.accessoires.length}`);
      if (item.customProperties.dureeFabrication) details.push(`Fabrication: ${item.customProperties.dureeFabrication}`);
    } else {
      details.push(`Bassin: ${item.nomBassin || 'Standard'}`);
      if (item.dimensions) details.push(`Dimensions: ${item.dimensions}`);
      if (item.materiau) details.push(`Matériau: ${item.materiau}`);
      if (item.couleur) details.push(`Couleur: ${item.couleur}`);
      if (item.customization?.dureeFabrication) details.push(`Délai: ${item.customization.dureeFabrication}`);
    }
    return details.join(' • ') || 'Détails non spécifiés';
  }

  getPromotionDisplay(item: PanierItem): string {
    if (!item.promotionActive || !item.bassin?.promotion) return '';
    const now = new Date();
    const startDate = new Date(item.bassin.promotion.dateDebut);
    const endDate = new Date(item.bassin.promotion.dateFin);
    return now >= startDate && now <= endDate ? `-${item.tauxReduction}%` : '';
  }

  formatReduction(tauxReduction: number | undefined): string {
    return tauxReduction ? `-${tauxReduction}%` : '';
  }

  calculateSubtotal(item: PanierItem): number {
    return this.roundPrice(this.calculateEffectivePrice(item) * item.quantity);
  }

  get cartTotal(): string {
    return this.formatPrice(this.calculateSubTotal());
  }

  private loadBassinDetails(item: PanierItem): void {
    if (!this.isBrowser || !item.bassinId) return;
    this.bassinService
      .getBassinDetails(item.bassinId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bassin) => {
          this.ngZone.run(() => {
            item.bassin = bassin;
            if (!item.imageUrl && bassin.imagesBassin?.length) {
              item.imageUrl = `${this.bassinService.getApiUrl()}/imagesBassin/getFS/${encodeURIComponent(bassin.imagesBassin[0].imagePath)}`;
            }
          });
        },
        error: (err) => console.error('Error loading bassin details:', err),
      });
  }

  onImageError(event: any): void {
    event.target.src = 'assets/default-image.webp';
  }

  getFirstImage(item: PanierItem): string {
    if (item.isCustomized) {
      if (item.customProperties?.imageUrl) return item.customProperties.imageUrl;
      if (item.customProperties?.bassinBase?.imageUrl) return item.customProperties.bassinBase.imageUrl;
      const material = item.customProperties?.materiau || item.customProperties?.materiauSelectionne;
      if (material && this.materiauxImages[material]) return this.materiauxImages[material];
      return 'assets/default-image.webp';
    }
    if (item.bassin?.imagesBassin?.[0]?.imagePath) {
      return `${this.bassinService.getApiUrl()}/imagesBassin/getFS/${encodeURIComponent(item.bassin.imagesBassin[0].imagePath)}`;
    }
    return 'assets/default-image.webp';
  }

  getAccessoiresDetails(item: PanierItem): string {
    if (!item.isCustomized || !item.customProperties?.accessoires?.length) return 'Aucun accessoire';
    const accessoiresList = item.customProperties.accessoires.map(
      (acc) => `${acc.nomAccessoire} (+${acc.prixAccessoire.toFixed(2)} TND)`
    );
    const totalAccessoires = item.customProperties.accessoires.reduce(
      (total, acc) => total + (acc.prixAccessoire || 0),
      0
    );
    return accessoiresList.length > 2 ? `${accessoiresList.length} accessoires (+${totalAccessoires.toFixed(2)} TND)` : accessoiresList.join(', ');
  }

  getImageUrl(item: PanierItem): string {
    if (item.isCustomized && item.customProperties?.imageUrl) return item.customProperties.imageUrl;
    if (item.bassin?.imagesBassin?.[0]?.imagePath) {
      return `${this.bassinService.getApiUrl()}/imagesBassin/getFS/${encodeURIComponent(item.bassin.imagesBassin[0].imagePath)}`;
    }
    return 'assets/default-image.webp';
  }

  getAccessoiresCount(item: PanierItem): number {
    return item.customProperties?.accessoires?.length || 0;
  }

  isItemOnPromotion(item: PanierItem): boolean {
    return item.promotionActive || false;
  }

  getSafeStock(item: PanierItem): number | null {
    return item.bassin?.stock ?? null;
  }

  getTotalCustomPrice(item: PanierItem): number {
    if (!item.isCustomized || !item.customProperties) return item.effectivePrice || item.prixOriginal || 0;
    const basePrice = item.customProperties.basePrice || 0;
    const materiauPrice = item.customProperties.materiauPrice || 0;
    const dimensionPrice = item.customProperties.dimensionPrice || 0;
    const accessoiresTotal = this.calculateAccessoiresTotal(item.customProperties.accessoires);
    let totalPrice = basePrice + materiauPrice + dimensionPrice + accessoiresTotal;
    if (item.promotionActive && item.tauxReduction) {
      totalPrice *= 1 - item.tauxReduction / 100;
    }
    return totalPrice;
  }

  getDisplayPrice(item: PanierItem): string {
    const price = item.isCustomized ? this.getTotalCustomPrice(item) : (item.effectivePrice ?? item.prixOriginal ?? 0);
    return this.formatPrice(price * (item.quantity ?? 1));
  }

  getFabricationDuration(bassin: Bassin): string {
    if (!bassin) return '';
    if (bassin.dureeFabricationJours) return `Délai: ${bassin.dureeFabricationJours} `;
    if (bassin.dureeFabricationJoursMin && bassin.dureeFabricationJoursMax) {
      return `Délai: ${bassin.dureeFabricationJoursMin} à ${bassin.dureeFabricationJoursMax} `;
    }
    return 'Délai: 3 à 15 jours';
  }

  getItemName(item: PanierItem): string {
    if (item.isCustomized) {
      return item.customProperties?.bassinBase?.nom ? `${item.customProperties.bassinBase.nom} (Personnalisé)` : 'Bassin personnalisé';
    }
    return item.bassin?.nomBassin || item.nomBassin || 'Bassin';
  }

  getItemDetails(item: PanierItem): string {
    const details = [];
    if (item.isCustomized && item.customProperties) {
      if (item.customProperties.dimensionSelectionnee) details.push(`Dimensions: ${item.customProperties.dimensionSelectionnee}`);
      if (item.customProperties.materiauSelectionne) details.push(`Matériau: ${item.customProperties.materiauSelectionne}`);
      if (item.customProperties.couleurSelectionnee) details.push(`Couleur: ${item.customProperties.couleurSelectionnee}`);
    } else {
      if (item.bassin?.dimensions) details.push(`Dimensions: ${item.bassin.dimensions}`);
      if (item.bassin?.materiau) details.push(`Matériau: ${item.bassin.materiau}`);
      if (item.bassin?.couleur) details.push(`Couleur: ${item.bassin.couleur}`);
    }
    return details.join(' • ') || 'Détails non spécifiés';
  }

  getAccessoriesList(item: PanierItem): string {
    if (!item.isCustomized || !item.customProperties?.accessoires?.length) return 'Aucun accessoire';
    return item.customProperties.accessoires.map((acc) => `${acc.nomAccessoire} (${acc.prixAccessoire.toFixed(2)} TND)`).join(', ');
  }

  roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  formatPrice(price: number): string {
    return `${this.roundPrice(price)} `;
  }

  getItemFabricationTime(item: PanierItem): string {
    if (item.isCustomized && item.customProperties?.dureeFabrication) {
      return `Fabrication: ${item.customProperties.dureeFabrication}`;
    }
    if (item.bassin?.dureeFabricationDisplay) {
      return `Fabrication: ${item.bassin.dureeFabricationDisplay}`;
    }
    return 'Fabrication: 3-15 jours';
  }

  isPromoActive(item: PanierItem): boolean {
    if (!item.promotionActive || !item.bassin?.promotion) return false;
    const now = new Date();
    const start = new Date(item.bassin.promotion.dateDebut);
    const end = new Date(item.bassin.promotion.dateFin);
    return now >= start && now <= end;
  }

  getPromoTimeLeft(item: PanierItem): string {
    if (!this.isPromoActive(item)) return '';
    const end = new Date(item.bassin!.promotion!.dateFin);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `(Expire dans ${days}j ${hours}h)`;
  }

  closeCart(): void {
    this.isCartOpen = false;
  }

  getBassinBase(item: PanierItem): any {
    return item.isCustomized && item.customProperties?.bassinBase ? item.customProperties.bassinBase : null;
  }

  getFullCustomizationDetails(item: PanierItem): any {
    if (!item.isCustomized) return null;
    const accessoires = item.customProperties?.accessoires || item.accessoireIds?.map((id) => ({
      idAccessoire: id,
      nomAccessoire: this.getAccessoireName(id),
      prixAccessoire: this.getAccessoirePrice(id),
    })) || [];
    return {
      bassin: { nom: item.nomBassin || 'Bassin personnalisé', id: item.bassinId },
      dimensions: item.customization?.dimensionSelectionnee || item.dimensions,
      materiau: item.customization?.materiauSelectionne || item.materiau,
      couleur: item.customization?.couleurSelectionnee || item.couleur,
      accessoires,
      dureeFabrication: item.dureeFabrication || 'À déterminer',
      prices: {
        base: item.prixOriginal,
        materiau: item.customization?.prixMateriau,
        dimension: item.customization?.prixDimension,
        accessoires: item.prixAccessoires,
        total: item.customization?.prixEstime,
      },
    };
  }

  getAccessoireName(accessoireId: number): string {
    return 'Accessoire ' + accessoireId;
  }

  getAccessoirePrice(accessoireId: number): number {
    return 0;
  }

  getDisplayDetails(item: PanierItem): string {
    if (!item.isCustomized) return 'Produit standard';
    const details = [];
    const custom = this.getFullCustomizationDetails(item);
    if (custom?.bassin?.nom) details.push(`Modèle: ${custom.bassin.nom}`);
    if (custom?.dimensions) details.push(`Dimensions: ${custom.dimensions}`);
    if (custom?.materiau) details.push(`Matériau: ${custom.materiau}`);
    if (custom?.couleur) details.push(`Couleur: ${custom.couleur}`);
    if (custom?.accessoires?.length) details.push(`${custom.accessoires.length} accessoire(s)`);
    return details.join(' • ');
  }

  closeMenuOnMobile(): void {
    if (this.isBrowser && window.innerWidth <= 768) {
      this.isMenuOpen = false;
    }
  }

  isMobileMenuOpen(): boolean {
    return this.isBrowser && this.isMenuOpen && window.innerWidth <= 768;
  }

  calculateAccessoiresTotal(accessoires: Accessoire[] | undefined): number {
    return accessoires ? accessoires.reduce((total, acc) => total + (acc.prixAccessoire || 0), 0) : 0;
  }

  private applyPromotion(price: number, tauxReduction?: number): number {
    return tauxReduction ? price * (1 - tauxReduction / 100) : price;
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Erreur serveur';
    if (error.status === 409) errorMessage = 'Stock insuffisant';
    else if (error.status === 400) errorMessage = 'Données invalides';
    else if (error.status === 404) errorMessage = 'Produit non trouvé';
    return throwError(() => errorMessage);
  }

  private async updateQuantity(item: PanierItem, newQuantity: number): Promise<void> {
    try {
      await this.cartService.updateQuantity(item, newQuantity).toPromise();
      this.ngZone.run(() => this.toastService.showSuccess('Quantité mise à jour'));
    } catch (error) {
      console.error('Erreur:', error);
      this.ngZone.run(() => this.toastService.showError('Erreur lors de la mise à jour de la quantité'));
      throw error;
    }
  }

  getItemFullName(item: PanierItem): string {
    if (item.isCustomized) {
      const baseName = item.customProperties?.bassinBase?.nom || item.nomBassin || 'Bassin';
      return `${baseName} Personnalisé`;
    }
    return item.bassin?.nomBassin || item.nomBassin || 'Bassin';
  }

  getMainImage(item: PanierItem): string {
    if (item.isCustomized) {
      if (item.customProperties?.bassinBase?.imageUrl) return item.customProperties.bassinBase.imageUrl;
      const material = item.customProperties?.materiauSelectionne || item.customProperties?.materiau;
      if (material && this.materiauxImages[material]) return this.materiauxImages[material];
      return 'assets/default-image.webp';
    }
    if (item.bassin?.imagesBassin?.[0]?.imagePath) {
      return `${this.bassinService.getApiUrl()}/imagesBassin/getFS/${encodeURIComponent(item.bassin.imagesBassin[0].imagePath)}`;
    }
    return 'assets/default-image.webp';
  }

  getCustomizationDetails(item: PanierItem): string[] {
    const details: string[] = [];
    if (!item.isCustomized) return details;
    if (item.customProperties?.dimensionSelectionnee) details.push(`Dimensions: ${item.customProperties.dimensionSelectionnee}`);
    if (item.customProperties?.materiauSelectionne) details.push(`Matériau: ${item.customProperties.materiauSelectionne}`);
    if (item.customProperties?.couleurSelectionnee) details.push(`Couleur: ${item.customProperties.couleurSelectionnee}`);
    return details;
  }

  getAccessoriesDetails(item: PanierItem): { name: string; price: number }[] {
    if (!item.isCustomized || !item.customProperties?.accessoires) return [];
    return item.customProperties.accessoires.map((acc) => ({
      name: acc.nomAccessoire,
      price: acc.prixAccessoire,
    }));
  }

  calculateAccessoriesTotal(item: PanierItem): number {
    return this.calculateAccessoiresTotal(item.customProperties?.accessoires);
  }

  getFabricationTime(item: PanierItem): string {
    if (item.isCustomized && item.customProperties?.dureeFabrication) {
      return `${item.customProperties.dureeFabrication}`;
    }
    if (item.bassin?.dureeFabricationDisplay) {
      return item.bassin.dureeFabricationDisplay;
    }
    return item.dureeFabrication || '3-15 jours';
  }

  getMaterialImage(material: string): string | null {
    return this.materiauxImages[material] || null;
  }

  mapCartItem(item: any): PanierItem {
    const customizationData = {
      materiauSelectionne: item.materiauSelectionne || (item.customization?.materiauSelectionne) || null,
      dimensionSelectionnee: item.dimensionSelectionnee || (item.customization?.dimensionSelectionnee) || null,
      couleurSelectionnee: item.couleurSelectionnee || (item.customization?.couleurSelectionnee) || null,
      prixMateriau: item.prixMateriau || (item.customization?.prixMateriau) || 0,
      prixDimension: item.prixDimension || (item.customization?.prixDimension) || 0,
      prixEstime: item.prixEstime || (item.customization?.prixEstime) || item.prixOriginal || 0,
      dureeFabrication: item.dureeFabrication || (item.customization?.dureeFabrication) || null,
    };

    const customization = {
      materiauSelectionne: customizationData.materiauSelectionne,
      prixMateriau: customizationData.prixMateriau,
      dimensionSelectionnee: customizationData.dimensionSelectionnee,
      prixDimension: customizationData.prixDimension,
      couleurSelectionnee: customizationData.couleurSelectionnee,
      prixEstime: customizationData.prixEstime,
      dureeFabrication: customizationData.dureeFabrication,
    };

    const customProperties: CustomProperties = {
      materiauSelectionne: customizationData.materiauSelectionne,
      dimensionSelectionnee: customizationData.dimensionSelectionnee,
      couleurSelectionnee: customizationData.couleurSelectionnee,
      prixEstime: customizationData.prixEstime,
      dureeFabrication: customizationData.dureeFabrication || '',
      materiauPrice: customizationData.prixMateriau,
      dimensionPrice: customizationData.prixDimension,
      accessoiresPrice: item.prixAccessoires || 0,
      basePrice: item.prixOriginal || 0,
      imageUrl: item.imageUrl || item.customImageUrl,
      isCustomized: item.isCustomized || false,
      accessoires: item.accessoires || [],
      nomBassin: item.nomBassin,
      bassinBase: item.bassinBase || { id: item.bassinId, nom: item.nomBassin || '', imageUrl: item.imageUrl || '', prix: item.prixOriginal || 0 },
    };

    const effectivePrice = item.effectivePrice || customizationData.prixEstime || (item.promotionActive ? item.prixPromo : item.prixOriginal) || 0;
    const subtotal = effectivePrice * (item.quantity || 1);

    return {
      id: item.id,
      quantity: item.quantity || 1,
      bassinId: item.bassinId,
      nomBassin: item.nomBassin,
      description: item.description,
      customization,
      prixUnitaire: effectivePrice,
      prixOriginal: item.prixOriginal || 0,
      prixAccessoires: item.prixAccessoires || 0,
      effectivePrice,
      subtotal,
      prix: item.prix || item.prixOriginal || 0,
      prixPromo: item.prixPromo,
      promotionActive: item.promotionActive || false,
      nomPromotion: item.nomPromotion,
      tauxReduction: item.tauxReduction || 0,
      status: item.status || 'SUR_COMMANDE',
      surCommande: item.status === 'SUR_COMMANDE' || Boolean(item.isCustomized),
      isCustomized: Boolean(item.isCustomized),
      customProperties,
      imageUrl: item.imageUrl,
      customImageUrl: item.customImageUrl,
      accessoires: item.accessoires || [],
      accessoireIds: item.accessoireIds || [],
      dureeFabrication: customizationData.dureeFabrication,
      dureeFabricationDisplay: customizationData.dureeFabrication ? `${customizationData.dureeFabrication}` : 'Non spécifié',
      bassin: item.bassin,
      bassinBase: item.bassinBase || { id: item.bassinId, nom: item.nomBassin || '', imageUrl: item.imageUrl || '', prix: item.prixOriginal || 0 },
    };
  }

  getItemImage(item: PanierItem): string {
    if (item.isCustomized) {
      if (item.imageUrl) return this.getFullImagePath(item.imageUrl);
      if (item.customization?.materiauSelectionne && this.materiauxImages[item.customization.materiauSelectionne]) {
        return this.materiauxImages[item.customization.materiauSelectionne];
      }
      if (item.customProperties?.bassinBase?.imageUrl) return this.getFullImagePath(item.customProperties.bassinBase.imageUrl);
    } else {
      if (item.imageUrl) return this.getFullImagePath(item.imageUrl);
      if (item.bassin?.imagesBassin?.[0]?.imagePath) {
        return `${this.bassinService.getApiUrl()}/imagesBassin/getFS/${encodeURIComponent(item.bassin.imagesBassin[0].imagePath)}`;
      }
    }
    return 'assets/default-image.webp';
  }

  getFullImagePath(path: string): string {
    if (path.startsWith('http') || path.startsWith('assets/')) return path;
    return `${this.bassinService.getApiUrl()}/imagesBassin/getFS/${encodeURIComponent(path)}`;
  }

  handleImageError(event: any, item: PanierItem): void {
    const target = event.target as HTMLImageElement;
    if (item.isCustomized && item.customization?.materiauSelectionne) {
      const materialImage = this.materiauxImages[item.customization.materiauSelectionne];
      if (materialImage) {
        target.src = materialImage;
        return;
      }
    }
    target.src = 'assets/default-image.webp';
  }

  confirmRemoveFromCart(item: PanierItem): void {
    if (!this.isBrowser) return;
    this.ngZone.run(() => {
      Swal.fire({
        title: 'Supprimer cet article ?',
        html: `Souhaitez-vous retirer <strong>${item.nomBassin || 'cet article'}</strong> de votre panier ?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
      }).then((result) => {
        if (result.isConfirmed) {
          this.removeFromCart(item);
        }
      });
    });
  }

  updateItemQuantity(item: PanierItem, newQuantity: number): void {
    if (!this.isBrowser) return;
    this.isLoading = true;
    this.cartService
      .updateCartItemQuantity(item.id, newQuantity)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            item.quantity = newQuantity;
            item.subtotal = this.calculateEffectivePrice(item) * newQuantity;
            this.totalPrice = this.calculateTotalPrice(this.cartItems);
            this._cartItemCount = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
            this.emptyCart = this.cartItems.length === 0;
            this.toastService.showSuccess('Quantité mise à jour');
          });
        },
        error: (error) => {
          console.error('Error updating quantity', error);
          this.ngZone.run(() => this.toastService.showError('Erreur lors de la mise à jour de la quantité'));
        },
      });
  }

  removeFromCart(item: PanierItem): void {
    if (!this.isBrowser || !item.id) {
      this.ngZone.run(() => this.toastService.showError('Impossible de supprimer cet article'));
      return;
    }
    this.isLoading = true;
    this.cartService
      .removeFromCart(item.id)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (success) => {
          this.ngZone.run(() => {
            if (success) {
              this.cartItems = this.cartItems.filter((i) => i.id !== item.id);
              this.totalPrice = this.calculateTotalPrice(this.cartItems);
              this.uniqueBasinCount = this.calculateUniqueBasinCount();
              this._cartItemCount = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
              this.emptyCart = this.cartItems.length === 0;
              this.toastService.showSuccess('Article supprimé avec succès');
            } else {
              this.toastService.showError('Échec de la suppression');
            }
          });
        },
        error: (error) => {
          console.error('Error removing item:', error);
          this.ngZone.run(() => this.toastService.showError('Erreur lors de la suppression'));
        },
      });
  }

  getItemDescription(item: PanierItem): string {
    if (item.isCustomized) {
      return `Bassin personnalisé avec ${item.customization?.materiauSelectionne || 'matériau standard'}, dimensions ${item.customization?.dimensionSelectionnee || 'standard'}`;
    }
    return item.bassin?.description || item.description || '';
  }

  calculateSupplements(item: PanierItem): number {
    if (!item.isCustomized) return 0;
    return (item.customization?.prixMateriau || 0) + (item.customization?.prixDimension || 0) + (item.prixAccessoires || 0);
  }

  calculateReduction(item: PanierItem): number {
    if (!item.promotionActive || !item.tauxReduction) return 0;
    const basePrice = item.prixOriginal || 0;
    const supplements = item.isCustomized ? this.calculateSupplements(item) : 0;
    return (basePrice + supplements) * item.tauxReduction;
  }

  getFormattedDuration(item: PanierItem): string {
    if (item.isCustomized && item.customization?.dureeFabrication) return `${item.customization.dureeFabrication}`;
    if (item.bassin?.dureeFabricationJoursMin && item.bassin?.dureeFabricationJoursMax) {
      return `${item.bassin.dureeFabricationJoursMin} à ${item.bassin.dureeFabricationJoursMax} `;
    }
    return item.dureeFabrication || '3-15 jours';
  }

  getColorCode(colorName: string): string {
    return this.colorMap[colorName] || '#CCCCCC';
  }

  getColorPreview(color: string | undefined): string {
    if (!color) return '#CCCCCC';
    const mappedColor = this.colorMap[color];
    if (mappedColor) return mappedColor;
    if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) return color;
    if (!this.isBrowser) return '#CCCCCC';
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      if (ctx.fillStyle !== color) return ctx.fillStyle;
    }
    return '#CCCCCC';
  }

  areAccessoiresIdentical(ids1?: number[], ids2?: number[]): boolean {
    if (!ids1 && !ids2) return true;
    if (!ids1 || !ids2 || ids1.length !== ids2.length) return false;
    return JSON.stringify(ids1.sort()) === JSON.stringify(ids2.sort());
  }

  getItemStatus(item: PanierItem): string {
    if (item.isCustomized) return 'SUR_COMMANDE';
    return item.bassin?.stock && item.bassin.stock > 0 ? 'DISPONIBLE' : 'SUR_COMMANDE';
  }

  getStatusDisplay(item: PanierItem): string {
    const status = this.getItemStatus(item);
    switch (status) {
      case 'DISPONIBLE': return 'Disponible';
      case 'SUR_COMMANDE': return 'Sur commande';
      case 'RUPTURE_STOCK': return 'Rupture de stock';
      default: return 'Sur commande';
    }
  }

  formatDureeFabrication(duree: string | undefined): string {
    if (!duree) return '';
    if (duree.includes('jours')) return duree;
    if (/^\d+$/.test(duree)) return `${duree} `;
    if (duree.includes('-')) return `${duree} `;
    return duree;
  }

  getFormattedFabricationTime(item: PanierItem): string {
    const status = this.getItemStatus(item);
    if (item.isCustomized && item.customProperties?.dureeFabrication) {
      return `Délai de fabrication: ${this.formatDureeFabrication(item.customProperties.dureeFabrication)}`;
    }
    if (status === 'SUR_COMMANDE') {
      if (item.dureeFabrication) return `Délai de fabrication: ${this.formatDureeFabrication(item.dureeFabrication)}`;
      if (item.bassin?.dureeFabricationJoursMin && item.bassin?.dureeFabricationJoursMax) {
        return `Délai de fabrication: ${item.bassin.dureeFabricationJoursMin} à ${item.bassin.dureeFabricationJoursMax} `;
      }
      if (item.bassin?.dureeFabricationDisplay) return `Délai de fabrication: ${item.bassin.dureeFabricationDisplay}`;
      return 'Sur commande';
    }
    return 'En stock';
  }

  canIncrementQuantity(item: PanierItem): boolean {
    if (!item.isCustomized && item.bassin?.stock !== undefined) {
      return item.quantity < item.bassin.stock;
    }
    const maxOrderQuantity = 10;
    return item.quantity < maxOrderQuantity;
  }

  incrementQuantity(item: PanierItem): void {
    if (!this.canIncrementQuantity(item)) return;
    this.updateItemQuantity(item, item.quantity + 1);
  }

  decrementQuantity(item: PanierItem): void {
    if (item.quantity <= 1) return;
    this.updateItemQuantity(item, item.quantity - 1);
  }

  getItemFinalPrice(item: PanierItem): string {
    const unitPrice = item.isCustomized
      ? (item.prixOriginal || 0) + (item.customization?.prixMateriau || 0) + (item.customization?.prixDimension || 0) + (item.prixAccessoires || 0)
      : (item.promotionActive && item.tauxReduction && item.bassin?.promotion ? (item.prixOriginal || 0) * (1 - item.tauxReduction) : item.prixOriginal || 0);
    return this.formatPrice(unitPrice * (item.quantity || 1));
  }

  calculateSubTotal(): number {
    return this.cartItems.reduce((total, item) => total + this.calculateEffectivePrice(item) * item.quantity, 0);
  }

  calculerFraisLivraison(): number {
    return this.cartItems.length > 0 ? 20 : 0;
  }

  getTotalAccessoriesPrice(item: PanierItem): number {
    return this.calculateAccessoiresTotal(item.customProperties?.accessoires);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cartSubscription?.unsubscribe();
    this.authSubscription?.unsubscribe();
  }
     ngAfterViewInit() {
        if (this.isBrowser) {
           
        }
    }
  loadUserData(): void {
    // Exemple de chargement des données utilisateur
    this.authService.currentUser$.subscribe(user => {
      this.client = user;
    });
  }
getProfileImageUrl(imagePath: string): string {
    if (!imagePath) {
      return 'assets/images/default-image-profile.webp';
    }
    
    // Si c'est déjà une URL complète
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Sinon, construire l'URL complète
    return `${this.authService.apiURL}/photos_profile/${imagePath}`;
  }
  }