import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, interval, takeUntil, debounceTime } from 'rxjs';
import { PanierItem } from '../../../core/models/panier-item.model';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { Bassin } from '../../../core/models/bassin.models';
import { AuthService } from '../../../core/authentication/auth.service';
import { BassinService } from '../../../core/services/bassin.service';
import { isPlatformBrowser } from '@angular/common';
import Swal from 'sweetalert2';
import { AuthStateService } from '../../../core/services/auth-state.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: PanierItem[] = [];
  subtotal: number = 0;
  vatRate: number = 0.18;
  vatAmount: number = 0;
  total: number = 0;
  isLoading: boolean = true;
  errorMessage: string = '';
  discount: number = 0;
  isBrowser: boolean = false;
  lastUpdate: Date | null = null;

  private cartSubscription!: Subscription;
  private promotionCheckInterval!: Subscription;
  private destroy$ = new Subject<void>();
  private updateSubject = new Subject<void>();

  materiauxImages: { [key: string]: string } = {
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
    'Bois composite': 'assets/img/materiaux/bois.jpg',
    'Résine époxy renforcée': 'assets/img/materiaux/resine.jpg',
  };

    // Color palette
private colorMap: { [key: string]: string } = {
  // Named colors
  'bleu clair': '#7EC0EE',
  'bleu foncé': '#1E90FF',
  'blanc': '#FFFFFF',
  'gris clair': '#D3D3D3',
  'gris foncé': '#A9A9A9',
  'beige': '#F5F5DC',
  'sable': '#F4A460',
  'vert': '#90EE90', // Explicitly included
  'rouge': '#FF6347',
  'noir': '#000000',
  'marron': '#A0522D',
  // Blues
  '#1976D2': '#1976D2', // Bleu royal foncé
  '#1E88E5': '#1E88E5', // Bleu royal
  '#2196F3': '#2196F3', // Bleu azur
  '#42A5F5': '#42A5F5', // Bleu azur clair
  '#64B5F6': '#64B5F6', // Bleu ciel
  '#90CAF9': '#90CAF9', // Bleu ciel pâle
  '#BBDEFB': '#BBDEFB', // Bleu pastel
  '#E3F2FD': '#E3F2FD', // Bleu très pâle
  // Greens
  '#2E7D32': '#2E7D32', // Vert émeraude foncé
  '#388E3C': '#388E3C', // Vert forêt
  '#43A047': '#43A047', // Vert pomme
  '#4CAF50': '#4CAF50', // Vert émeraude
  '#66BB6A': '#66BB6A', // Vert clair
  '#81C784': '#81C784', // Vert menthe
  '#A5D6A7': '#A5D6A7', // Vert menthe pâle
  '#E8F5E9': '#E8F5E9', // Vert très pâle
  // Reds
  '#C62828': '#C62828', // Rouge rubis foncé
  '#D32F2F': '#D32F2F', // Rouge rubis
  '#E53935': '#E53935', // Rouge vif
  '#F44336': '#F44336', // Rouge cardinal
  '#EF5350': '#EF5350', // Rouge corail
  '#E57373': '#E57373', // Rouge corail clair
  '#EF9A9A': '#EF9A9A', // Rouge rose
  '#FFEBEE': '#FFEBEE', // Rouge très pâle
  // Grays
  '#212121': '#212121', // Gris anthracite
  '#424242': '#424242', // Gris charbon
  '#616161': '#616161', // Gris ardoise
  '#757575': '#757575', // Gris moyen
  '#9E9E9E': '#9E9E9E', // Gris argent
  '#BDBDBD': '#BDBDBD', // Gris clair
  '#E0E0E0': '#E0E0E0', // Gris perle
  '#EEEEEE': '#EEEEEE', // Gris très clair
  // Browns
  '#5D4037': '#5D4037', // Brun chocolat
  '#6D4C41': '#6D4C41', // Brun acajou
  '#795548': '#795548', // Brun café
  '#8D6E63': '#8D6E63', // Brun terre
  '#A1887F': '#A1887F', // Brun sable
  '#BCAAA4': '#BCAAA4', // Brun clair
  '#D7CCC8': '#D7CCC8', // Brun rosé
  '#EFEBE9': '#EFEBE9', // Brun très pâle
  // Purples
  '#7B1FA2': '#7B1FA2', // Violet prune foncé
  '#8E24AA': '#8E24AA', // Violet prune
  '#9C27B0': '#9C27B0', // Violet pourpre
  '#AB47BC': '#AB47BC', // Violet améthyste
  '#BA68C8': '#BA68C8', // Violet lavande
  '#CE93D8': '#CE93D8', // Violet lavande clair
  '#E1BEE7': '#E1BEE7', // Violet pastel
  '#F3E5F5': '#F3E5F5', // Violet très pâle
  // Yellows
  '#F57F17': '#F57F17', // Jaune ambre foncé
  '#F9A825': '#F9A825', // Jaune ambre
  '#FBC02D': '#FBC02D', // Jaune moutarde
  '#FFEB3B': '#FFEB3B', // Jaune vif
  '#FFEE58': '#FFEE58', // Jaune citron
  '#FFF59D': '#FFF59D', // Jaune pâle
  '#FFF9C4': '#FFF9C4', // Jaune crème
  '#FFFDE7': '#FFFDE7', // Jaune très pâle
  // Cyans
  '#006064': '#006064', // Cyan foncé
  '#00838F': '#00838F', // Cyan profond
  '#0097A7': '#0097A7', // Cyan turquoise
  '#00BCD4': '#00BCD4', // Cyan clair
  '#26C6DA': '#26C6DA', // Cyan aquatique
  '#4DD0E1': '#4DD0E1', // Cyan ciel
  '#80DEEA': '#80DEEA', // Cyan pâle
  '#E0F7FA': '#E0F7FA', // Cyan très pâle
  // Oranges
  '#E65100': '#E65100', // Orange brûlé
  '#EF6C00': '#EF6C00', // Orange foncé
  '#F57C00': '#F57C00', // Orange vif
  '#FB8C00': '#FB8C00', // Orange mandarine
  '#FFA726': '#FFA726', // Orange clair
  '#FFB74D': '#FFB74D', // Orange abricot
  '#FFCC80': '#FFCC80', // Orange pêche
  '#FFF3E0': '#FFF3E0', // Orange très pâle
  // Pinks
  '#AD1457': '#AD1457', // Rose framboise
  '#C2185B': '#C2185B', // Rose fuchsia
  '#D81B60': '#D81B60', // Rose magenta
  '#E91E63': '#E91E63', // Rose vif
  '#EC407A': '#EC407A', // Rose clair
  '#F06292': '#F06292', // Rose bonbon
  '#F8BBD0': '#F8BBD0', // Rose pastel
  '#FCE4EC': '#FCE4EC', // Rose très pâle
  // Indigos
  '#283593': '#283593', // Indigo foncé
  '#303F9F': '#303F9F', // Indigo profond
  '#3949AB': '#3949AB', // Indigo classique
  '#3F51B5': '#3F51B5', // Indigo
  '#5C6BC0': '#5C6BC0', // Indigo clair
  '#7986CB': '#7986CB', // Indigo pâle
  '#C5CAE9': '#C5CAE9', // Indigo pastel
  '#E8EAF6': '#E8EAF6', // Indigo très pâle
  // Teals
  '#004D40': '#004D40', // Turquoise foncé
  '#00695C': '#00695C', // Turquoise profond
  '#00796B': '#00796B', // Turquoise vert
  '#009688': '#009688', // Turquoise
  '#26A69A': '#26A69A', // Turquoise clair
  '#4DB6AC': '#4DB6AC', // Turquoise menthe
  '#80CBC4': '#80CBC4', // Turquoise pâle
  '#E0F2F1': '#E0F2F1', // Turquoise très pâle
  // Limes
  '#827717': '#827717', // Citron vert foncé
  '#9E9D24': '#9E9D24', // Citron vert olive
  '#AFB42B': '#AFB42B', // Citron vert vif
  '#CDDC39': '#CDDC39', // Citron vert
  '#D4E157': '#D4E157', // Citron vert clair
  '#DCE775': '#DCE775', // Citron vert pâle
  '#F0F4C3': '#F0F4C3', // Citron vert pastel
  '#F9FBE7': '#F9FBE7', // Citron vert très pâle
};

  isAuthenticated: boolean = false;

  constructor(
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public authStateService: AuthStateService,
    public authService: AuthService,
    private bassinService: BassinService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Debounce updates to prevent rapid changes
    this.updateSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.calculateTotals();
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.cartService.forceRefreshCart().subscribe({
        next: (cart) => {
          console.log('Panier rafraîchi:', cart);
          this.lastUpdate = new Date();
        },
        error: (err) => console.error('Erreur lors du rafraîchissement du panier:', err)
      });

      this.authStateService.isLoggedIn$.subscribe(isLoggedIn => {
        this.isAuthenticated = isLoggedIn;
        this.cdr.markForCheck();
      });

      this.loadCart();
      this.setupPromotionCheck();
    }
  }

  private setupPromotionCheck(): void {
    if (this.isBrowser) {
      // Check every 5 minutes
      this.promotionCheckInterval = interval(300000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.checkPromotionsUpdates();
        });

      // Check when tab becomes visible
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkPromotionsUpdates();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }

    if (this.promotionCheckInterval) {
      this.promotionCheckInterval.unsubscribe();
    }

    if (this.isBrowser) {
      document.removeEventListener('visibilitychange', () => {});
    }
  }

  checkPromotionsUpdates(): void {
    if (this.cartItems.length === 0 || !this.isBrowser) return;

    this.bassinService.listeBassinsAvecPromotions().subscribe({
      next: (updatedBassins) => {
        let needsUpdate = false;

        this.cartItems.forEach((item) => {
          if (!item.isCustomized && item.bassinId) {
            const updatedBassin = updatedBassins.find(b => b.idBassin === item.bassinId);
            if (updatedBassin) {
              const oldPrice = this.getEffectivePrice(item);

              const now = new Date();
              const startDate = new Date(updatedBassin.promotion?.dateDebut || '');
              const endDate = new Date(updatedBassin.promotion?.dateFin || '');

              const isPromoActive = updatedBassin.promotion && now >= startDate && now <= endDate;

              if (isPromoActive) {
                item.promotionActive = true;
                item.tauxReduction = updatedBassin.promotion?.tauxReduction || 0;
                item.prixOriginal = updatedBassin.prix;
                item.prixPromo = parseFloat((updatedBassin.prix * (1 - item.tauxReduction)).toFixed(2));
              } else {
                item.promotionActive = false;
                item.prixPromo = updatedBassin.prix;
                item.tauxReduction = 0;
              }

              if (oldPrice !== this.getEffectivePrice(item)) {
                needsUpdate = true;
              }
            }
          }
        });

        if (needsUpdate) {
          this.calculateTotals();
          this.lastUpdate = new Date();
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.error('Erreur vérification promotions:', err);
      }
    });
  }

  loadCart(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.cartSubscription = this.cartService.getCartItems().subscribe({
      next: (items: PanierItem[]) => {
        const loadPromises = items.map((item) => {
          return new Promise<void>((resolve) => {
            if (!item.bassin && item.bassinId) {
              this.bassinService.consulterBassin(item.bassinId).subscribe({
                next: (bassin) => {
                  item.bassin = bassin;
                  this.updatePromotionStatus(item);
                  resolve();
                },
                error: () => resolve(),
              });
            } else {
              this.updatePromotionStatus(item);
              resolve();
            }
          });
        });

        Promise.all(loadPromises).then(() => {
          this.cartItems = items;
          this.calculateTotals();
          this.isLoading = false;
          this.lastUpdate = new Date();
          this.checkPromotionsUpdates();
        });
      },
      error: (error) => {
        console.error('Error loading cart:', error);
        this.errorMessage = 'Impossible de charger votre panier. Veuillez réessayer.';
        this.isLoading = false;
      },
    });
  }

  private updatePromotionStatus(item: PanierItem): void {
    if (item.isCustomized) {
      item.promotionActive = false;
      item.tauxReduction = 0;
      item.prixPromo = item.customProperties?.prixEstime || item.prixOriginal || 0;
      return;
    }

    if (!item.bassin?.promotion) {
      item.promotionActive = false;
      item.prixPromo = item.bassin?.prix || 0;
      item.tauxReduction = 0;
      return;
    }

    const now = new Date();
    const startDate = new Date(item.bassin.promotion.dateDebut);
    const endDate = new Date(item.bassin.promotion.dateFin);

    const wasPromoActive = item.promotionActive;
    item.promotionActive = now >= startDate && now <= endDate;

    item.prixOriginal = item.bassin.prix || 0;
    item.tauxReduction = item.bassin.promotion.tauxReduction || 0;

    if (item.promotionActive) {
      item.prixPromo = parseFloat((item.prixOriginal * (1 - item.tauxReduction)).toFixed(2));
    } else {
      item.prixPromo = item.prixOriginal;
    }

    if (wasPromoActive !== item.promotionActive) {
      this.updateSubject.next();
    }
  }

  calculateTotals(): void {
    this.subtotal = this.cartItems.reduce(
      (total, item) => total + this.calculateSubtotal(item),
      0
    );

    this.discount = this.cartItems.reduce((total, item) => {
      if (!item.isCustomized && item.promotionActive && item.prixOriginal) {
        const originalPrice = item.prixOriginal * item.quantity;
        const currentPrice = this.getEffectivePrice(item) * item.quantity;
        return total + (originalPrice - currentPrice);
      }
      return total;
    }, 0);

    this.vatAmount = parseFloat((this.subtotal * this.vatRate).toFixed(2));
    this.total = parseFloat((this.subtotal + this.vatAmount).toFixed(2));
    this.updateSubject.next();
  }

  getEffectivePrice(item: PanierItem): number {
    if (item.isCustomized && item.customProperties?.prixEstime) {
      // Customized basins: use estimated price without promotion
      return item.customProperties.prixEstime;
    }

    if (!item.isCustomized && item.promotionActive && item.tauxReduction !== undefined) {
      // Standard basins with active promotion
      return item.prixPromo ?? (item.prixOriginal ?? item.bassin?.prix ?? 0) * (1 - item.tauxReduction);
    }

    // Standard basins without promotion
    return item.prixOriginal ?? item.bassin?.prix ?? 0;
  }

 getFabricationDuration (item: PanierItem): string {
    if (item.isCustomized && item.customProperties?.dureeFabrication) {
      // Customized basin: use duration from customProperties
      return `${item.customProperties.dureeFabrication} jours`;
    }

    if (!item.isCustomized && item.bassin) {
      // Standard basin: use duration from Bassin model
      if (item.bassin.dureeFabricationJours) {
        return `${item.bassin.dureeFabricationJours} jours`;
      }
      if (item.bassin.dureeFabricationJoursMin && item.bassin.dureeFabricationJoursMax) {
        return `${item.bassin.dureeFabricationJoursMin}-${item.bassin.dureeFabricationJoursMax} jours`;
      }
      return item.bassin.dureeFabricationDisplay || '3-15 jours';
    }

    return '3-15 jours'; // Fallback
  }

  getItemFullName(item: PanierItem): string {
    if (item.isCustomized) {
      const baseName = item.customProperties?.bassinBase?.nom || item.nomBassin || 'Bassin';
      return `${baseName} Personnalisé`;
    }
    return item.bassin?.nomBassin || item.nomBassin || 'Bassin';
  }

  calculateSubtotal(item: PanierItem): number {
    return parseFloat((this.getEffectivePrice(item) * item.quantity).toFixed(2));
  }

  calculateDiscount(item: PanierItem): number {
    if (item.isCustomized || !item.promotionActive || !item.tauxReduction || !item.prixOriginal) {
      return 0;
    }
    return parseFloat((item.prixOriginal * item.tauxReduction * item.quantity).toFixed(2));
  }

  getDiscountPercentage(item: PanierItem): number {
    if (item.isCustomized || !item.promotionActive || item.tauxReduction === undefined) {
      return 0;
    }
    return Math.round(item.tauxReduction * 100);
  }

  removeFromCart(item: PanierItem): void {
    if (!item.id) {
     // this.toastService.showError('Impossible de supprimer cet article');
      return;
    }

    Swal.fire({
      title: 'Confirmer la suppression',
      text: 'Êtes-vous sûr de vouloir retirer cet article de votre panier?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        this.cartService.removeFromCart(item.id).subscribe({
          next: () => {
        //    this.toastService.showSuccess('Article supprimé du panier');
            this.loadCart();
          },
          error: (error: any) => {
            console.error('Error removing item:', error);
       //     this.toastService.showError("Erreur lors de la suppression de l'article");
          },
        });
      }
    });
  }

  getLastUpdateTime(): string {
    if (!this.lastUpdate) return '';
    return this.lastUpdate.toLocaleTimeString();
  }

  clearCart(): void {
    Swal.fire({
      title: 'Vider le panier',
      text: 'Êtes-vous sûr de vouloir supprimer tous les articles de votre panier ? Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, vider le panier',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        this.cartService.clearCart().subscribe({
          next: () => {
            Swal.fire({
              title: 'Panier vidé !',
              text: 'Tous les articles ont été supprimés de votre panier.',
              icon: 'success',
              timer: 2000,
              timerProgressBar: true,
              showConfirmButton: false,
            });
            this.loadCart();
          },
          error: (error: any) => {
            console.error('Error clearing cart:', error);
            Swal.fire({
              title: 'Erreur',
              text: 'Une erreur est survenue lors de la suppression des articles. Veuillez réessayer.',
              icon: 'error',
              confirmButtonText: 'OK',
            });
          },
        });
      }
    });
  }

  goToShop(): void {
    this.router.navigate(['/shop']);
  }

  proceedToCheckout(): void {
    if (this.cartItems.length === 0) {
     // this.toastService.showError('Votre panier est vide');
      return;
    }

    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/checkout' },
      });
    //  this.toastService.showInfo(
       // 'Veuillez vous connecter ou créer un compte pour finaliser votre commande'
   //   );
    } else {
      this.router.navigate(['/checkout']);
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

  formatDimensions(dimensions: string | string[]): string {
    if (!dimensions) return 'Non spécifié';
    if (Array.isArray(dimensions)) return dimensions.join(' × ') + ' cm';
    return dimensions;
  }

  formatMateriaux(materiau: string | string[]): string {
    if (!materiau) return 'Non spécifié';
    if (Array.isArray(materiau)) return materiau.join(', ');
    return materiau;
  }

  getTimeLeft(endDateStr: string): string {
    const endDate = new Date(endDateStr);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();

    if (diff <= 0) return 'expirée';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${days}j ${hours}h ${minutes}m`;
  }

  async incrementQuantity(item: PanierItem): Promise<void> {
    try {
      if (item.isCustomized) {
        await this.updateQuantity(item, item.quantity + 1);
        return;
      }

      if (!item.bassin || item.bassin.stock === undefined) {
        await Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de vérifier le stock pour ce produit',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      if (item.bassin.stock <= 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Rupture de stock',
          text: 'Ce produit est actuellement en rupture de stock',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      if (item.quantity >= item.bassin.stock) {
        await Swal.fire({
          icon: 'warning',
          title: 'Stock insuffisant',
          html: `Vous ne pouvez pas commander plus de <b>${item.bassin.stock}</b> unité(s) de ce produit`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#3085d6',
        });
        return;
      }

      await this.updateQuantity(item, item.quantity + 1);
    } catch (error) {
      console.error("Erreur lors de l'incrémentation:", error);
      await Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Une erreur est survenue lors de la mise à jour de la quantité',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3085d6',
      });
    }
  }

  public async updateQuantity(
    item: PanierItem,
    newQuantity: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cartService.updateQuantity(item, newQuantity).subscribe({
        next: (updatedItem) => {
          item.quantity = newQuantity;
          this.calculateTotals();
          Swal.fire({
            icon: 'success',
            title: 'Quantité mise à jour',
            showConfirmButton: false,
            timer: 1500,
          });
          resolve();
        },
        error: (err) => {
          console.error('Erreur:', err);
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Erreur lors de la mise à jour de la quantité',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6',
          });
          this.loadCart();
          reject(err);
        },
      });
    });
  }

  decrementQuantity(item: PanierItem): void {
    const newQuantity = item.quantity - 1;

    if (newQuantity <= 0) {
      this.removeFromCart(item);
    } else {
      this.updateQuantity(item, newQuantity);
    }
  }

  private showStockAlert(availableStock: number): void {
    if (availableStock === 0) {
  //    this.toastService.showWarning('Ce produit est en rupture de stock');
    } else {
    //  this.toastService.showWarning(
     //   `Vous ne pouvez pas commander plus de ${availableStock} unités`
     // );
    }
  }

  refreshPromotions(): void {
    if (this.isBrowser) {
      this.checkPromotionsUpdates();
    }
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

  debugPromotions(): void {
    this.cartItems.forEach((item) => {
      if (!item.isCustomized && item.bassin?.promotion) {
        console.log('Détails promotion pour', item.bassin.nomBassin, ':');
        console.log('- Active:', item.promotionActive);
        console.log('- Taux:', item.tauxReduction);
        console.log('- Prix original:', item.prixOriginal);
        console.log('- Prix promo:', item.prixPromo);
        console.log(
          '- Dates:',
          item.bassin.promotion.dateDebut,
          'à',
          item.bassin.promotion.dateFin
        );
      }
    });
  }

  getStatusDisplay(item: PanierItem): string {
    if (item.isCustomized) {
      return 'Personnalisé';
    }
    switch (item.status) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'SUR_COMMANDE':
        return 'Sur commande';
      case 'RUPTURE_STOCK':
        return 'Rupture de stock';
      default:
        return item.bassin?.statut || 'Statut inconnu';
    }
  }


  getMaxQuantity(item: PanierItem): number {
    if (item.isCustomized) {
      return 999;
    }
    
    return item.bassin?.stock || 1;
  }

  canIncrementQuantity(item: PanierItem): boolean {
    if (item.isCustomized) {
      return item.quantity < 999; // Reasonable limit for customized items
    }
    
    if (item.bassin && item.bassin.stock !== undefined) {
      return item.quantity < item.bassin.stock;
    }
    
    return true;
  }

  hasCustomItems(): boolean {
    return this.cartItems.some(item => item.isCustomized);
  }

  getEstimatedDeliveryTime(): string {
    const customItems = this.cartItems.filter(item => item.isCustomized);
    
    if (customItems.length === 0) {
      return '2-3 jours ouvrables';
    }

    const maxDays = customItems.reduce((max, item) => {
      const days = item.customProperties?.dureeFabrication 
        ? parseInt(item.customProperties.dureeFabrication.toString()) 
        : 15;
      return Math.max(max, days);
    }, 0);

    return maxDays > 0 
      ? `Jusqu'à ${maxDays} jours ouvrables` 
      : '2-3 jours ouvrables';
  }

  redirectToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }


getColorName(color: string | undefined): string {
  if (!color) return 'Couleur inconnue';

  // Normalize color input (case-insensitive)
  const normalizedColor = color.toLowerCase();

  const colorNames: { [key: string]: string } = {
    // Named colors (matching colorMap keys)
    'bleu clair': 'Bleu clair',
    'bleu foncé': 'Bleu foncé',
    'blanc': 'Blanc',
    'gris clair': 'Gris clair',
    'gris foncé': 'Gris foncé',
    'beige': 'Beige',
    'sable': 'Sable',
    'vert': 'Vert',
    'rouge': 'Rouge',
    'noir': 'Noir',
    'marron': 'Marron',
    // Blues
    '#1976D2': 'Bleu royal foncé',
    '#1E88E5': 'Bleu royal',
    '#2196F3': 'Bleu azur',
    '#42A5F5': 'Bleu azur clair',
    '#64B5F6': 'Bleu ciel',
    '#90CAF9': 'Bleu ciel pâle',
    '#BBDEFB': 'Bleu pastel',
    '#E3F2FD': 'Bleu très pâle',
    // Greens
    '#2E7D32': 'Vert émeraude foncé',
    '#388E3C': 'Vert forêt',
    '#43A047': 'Vert pomme',
    '#4CAF50': 'Vert émeraude',
    '#66BB6A': 'Vert clair',
    '#81C784': 'Vert menthe',
    '#A5D6A7': 'Vert menthe pâle',
    '#E8F5E9': 'Vert très pâle',
    '#90EE90': 'Vert', // Explicitly included
    // Reds
    '#C62828': 'Rouge rubis foncé',
    '#D32F2F': 'Rouge rubis',
    '#E53935': 'Rouge vif',
    '#F44336': 'Rouge cardinal',
    '#EF5350': 'Rouge corail',
    '#E57373': 'Rouge corail clair',
    '#EF9A9A': 'Rouge rose',
    '#FFEBEE': 'Rouge très pâle',
    // Grays
    '#212121': 'Gris anthracite',
    '#424242': 'Gris charbon',
    '#616161': 'Gris ardoise',
    '#757575': 'Gris moyen',
    '#9E9E9E': 'Gris argent',
    '#BDBDBD': 'Gris clair',
    '#E0E0E0': 'Gris perle',
    '#EEEEEE': 'Gris très clair',
    // Browns
    '#5D4037': 'Brun chocolat',
    '#6D4C41': 'Brun acajou',
    '#795548': 'Brun café',
    '#8D6E63': 'Brun terre',
    '#A1887F': 'Brun sable',
    '#BCAAA4': 'Brun clair',
    '#D7CCC8': 'Brun rosé',
    '#EFEBE9': 'Brun très pâle',
    // Purples
    '#7B1FA2': 'Violet prune foncé',
    '#8E24AA': 'Violet prune',
    '#9C27B0': 'Violet pourpre',
    '#AB47BC': 'Violet améthyste',
    '#BA68C8': 'Violet lavande',
    '#CE93D8': 'Violet lavande clair',
    '#E1BEE7': 'Violet pastel',
    '#F3E5F5': 'Violet très pâle',
    // Yellows
    '#F57F17': 'Jaune ambre foncé',
    '#F9A825': 'Jaune ambre',
    '#FBC02D': 'Jaune moutarde',
    '#FFEB3B': 'Jaune vif',
    '#FFEE58': 'Jaune citron',
    '#FFF59D': 'Jaune pâle',
    '#FFF9C4': 'Jaune crème',
    '#FFFDE7': 'Jaune très pâle',
    // Cyans
    '#006064': 'Cyan foncé',
    '#00838F': 'Cyan profond',
    '#0097A7': 'Cyan turquoise',
    '#00BCD4': 'Cyan clair',
    '#26C6DA': 'Cyan aquatique',
    '#4DD0E1': 'Cyan ciel',
    '#80DEEA': 'Cyan pâle',
    '#E0F7FA': 'Cyan très pâle',
    // Oranges
    '#E65100': 'Orange brûlé',
    '#EF6C00': 'Orange foncé',
    '#F57C00': 'Orange vif',
    '#FB8C00': 'Orange mandarine',
    '#FFA726': 'Orange clair',
    '#FFB74D': 'Orange abricot',
    '#FFCC80': 'Orange pêche',
    '#FFF3E0': 'Orange très pâle',
    // Pinks
    '#AD1457': 'Rose framboise',
    '#C2185B': 'Rose fuchsia',
    '#D81B60': 'Rose magenta',
    '#E91E63': 'Rose vif',
    '#EC407A': 'Rose clair',
    '#F06292': 'Rose bonbon',
    '#F8BBD0': 'Rose pastel',
    '#FCE4EC': 'Rose très pâle',
    // Indigos
    '#283593': 'Indigo foncé',
    '#303F9F': 'Indigo profond',
    '#3949AB': 'Indigo classique',
    '#3F51B5': 'Indigo',
    '#5C6BC0': 'Indigo clair',
    '#7986CB': 'Indigo pâle',
    '#C5CAE9': 'Indigo pastel',
    '#E8EAF6': 'Indigo très pâle',
    // Teals
    '#004D40': 'Turquoise foncé',
    '#00695C': 'Turquoise profond',
    '#00796B': 'Turquoise vert',
    '#009688': 'Turquoise',
    '#26A69A': 'Turquoise clair',
    '#4DB6AC': 'Turquoise menthe',
    '#80CBC4': 'Turquoise pâle',
    '#E0F2F1': 'Turquoise très pâle',
    // Limes
    '#827717': 'Citron vert foncé',
    '#9E9D24': 'Citron vert olive',
    '#AFB42B': 'Citron vert vif',
    '#CDDC39': 'Citron vert',
    '#D4E157': 'Citron vert clair',
    '#DCE775': 'Citron vert pâle',
    '#F0F4C3': 'Citron vert pastel',
    '#F9FBE7': 'Citron vert très pâle'
  };

  // If input is a hex code, return its name
  if (colorNames[normalizedColor]) {
    return colorNames[normalizedColor];
  }

  // If input is a color name, find its normalized name
  const reverseColorName = Object.keys(colorNames).find(
    key => key.toLowerCase() === normalizedColor
  );
  if (reverseColorName) {
    return colorNames[reverseColorName];
  }

  // Check if input is a hex code in colorMap
  const hexMatch = Object.keys(this.colorMap).find(
    key => this.colorMap[key].toLowerCase() === normalizedColor
  );
  if (hexMatch && colorNames[this.colorMap[hexMatch]]) {
    return colorNames[this.colorMap[hexMatch]];
  }

  return 'Couleur inconnue';
}

// Replace the existing getColorPreview method
getColorPreview(color: string | undefined): string {
  if (!color) return '#CCCCCC';

  // Check if color is a name in colorMap
  const mappedColor = this.colorMap[color.toLowerCase()];
  if (mappedColor) {
    return mappedColor;
  }

  // Check if color is already a valid hex code
  if (/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
    return color;
  }

  // Try to resolve color name to hex via canvas
  const ctx = document.createElement('canvas').getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    const resolvedColor = ctx.fillStyle;
    if (resolvedColor !== color && /^#([0-9A-F]{3}){1,2}$/i.test(resolvedColor)) {
      return resolvedColor;
    }
  }

  return '#CCCCCC'; // Fallback
}
}