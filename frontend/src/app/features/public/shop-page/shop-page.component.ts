import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { Subject, Subscription, forkJoin, interval, of } from 'rxjs';
import { catchError, finalize, takeUntil, timeout, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { BassinService } from '../../../core/services/bassin.service';
import { CategorieService } from '../../../core/services/categorie.service';
import { CartService } from '../../../core/services/cart.service';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FavoritesService } from '../../../core/services/favorites.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Bassin } from '../../../core/models/bassin.models';
import { Categorie } from '../../../core/models/categorie.models';
import { Promotion } from '../../../core/models/promotion.model';
import { PanierItem } from '../../../core/models/panier-item.model';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import Swal from 'sweetalert2';
import { lastValueFrom } from 'rxjs';
@Component({
  selector: 'app-shop-page',
  templateUrl: './shop-page.component.html',
  styleUrls: ['./shop-page.component.css'],
  animations: [
    trigger('cardAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('staggerAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger('50ms', animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class ShopPageComponent implements OnInit, OnDestroy {
  bassins: Bassin[] = [];
  categories: Categorie[] = [];
  filteredBassins: Bassin[] = [];
  selectedCategories: number[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  minPrice: number = 0;
  maxPrice: number = 5000;
  selectedPrice: number = this.maxPrice;
  sortOrder: string = 'asc';
  hoveredProduct: number | null = null;
  showOnlyPromotions: boolean = false;
  showAvailable: boolean = true;
  showOnOrder: boolean = true;
  isBrowser: boolean;
  timerSubscription: Subscription | null = null;
  activePromotions: Promotion[] = [];
  nextEndingPromotion: Promotion | null = null;
  countdownTime: { days: number; hours: number; minutes: number; seconds: number } = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };
  cartItems: PanierItem[] = [];
  totalPrice: number = 0;
  currentPage: number = 1;
  itemsPerPage: number = 9;
  pagedBassins: Bassin[] = [];
  startIndex: number = 0;
  endIndex: number = 0;
  totalPages: number = 0;
  showFiltersMobile: boolean = false;
  minPriceLimit: number = 0;
  maxPriceLimit: number = 10000;

  private dataSubscription: Subscription | null = null;
  private cartSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();

  searchKeyword: string = ''; // Add property for search input
  private searchSubject = new Subject<string>(); // Add Subject for debounced search

  constructor(
    private bassinService: BassinService,
    private categorieService: CategorieService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private favoritesService: FavoritesService,
    private toastService: ToastService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.minPriceLimit = 0;
    this.maxPriceLimit = 10000;
    this.minPrice = 0;
    this.selectedPrice = this.maxPriceLimit;

    this.loadData();

    this.cartSubscription = this.cartService.panier$
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged(
          (prev, curr) =>
            prev?.items?.length === curr?.items?.length &&
            JSON.stringify(prev?.items) === JSON.stringify(curr?.items)
        ),
        debounceTime(100)
      )
      .subscribe({
        next: (panier) => {
          this.cartItems = panier?.items || [];
          this.totalPrice = this.calculateTotalPrice(this.cartItems);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Erreur dans l\'abonnement au panier:', err);
          this.toastService.showError('Erreur de chargement du panier');
        },
      });

    if (this.isBrowser) {
      this.startPromotionCountdown();
    }

    this.searchSubject
      .pipe(
        debounceTime(100), // Wait 300ms after typing stops
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
        this.cdr.markForCheck();
      });
  }
onSearchChange(): void {
    this.searchSubject.next(this.searchKeyword);
  }

  private calculatePriceRange(): void {
    try {
      const prices = this.bassins
        .map((b) => (b.promotionActive ? b.prixPromo ?? b.prix : b.prix))
        .filter((price) => !isNaN(price) && price !== null && price !== undefined);

      if (prices.length > 0) {
        this.maxPrice = Math.max(...prices);
        this.maxPriceLimit = Math.min(this.maxPrice, 10000);
        this.selectedPrice = Math.min(this.selectedPrice, this.maxPriceLimit);
        setTimeout(() => this.updateSliderTrack(), 0);
      } else {
        this.maxPrice = this.maxPriceLimit;
      }
    } catch (error) {
      console.error('Erreur dans le calcul des prix:', error);
      this.maxPrice = this.maxPriceLimit;
    }
  }

  startPromotionCountdown(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }

    this.timerSubscription = interval(1000).subscribe(() => {
      this.updateCountdown();
      this.cdr.detectChanges();
    });
  }

  private calculateTotalPrice(items: PanierItem[]): number {
    return items.reduce((total, item) => {
      const quantity = item.quantity || 1;
      let itemPrice = item.effectivePrice || item.prixOriginal || 0;

      if (item.promotionActive && item.tauxReduction) {
        const reduction = Number(item.tauxReduction) / 100;
        itemPrice *= 1 - reduction;
      }

      return total + itemPrice * quantity;
    }, 0);
  }

  private updateCountdown(): void {
    if (!this.nextEndingPromotion || !this.nextEndingPromotion.dateFin) return;

    const now = new Date().getTime();
    const endTime = new Date(this.nextEndingPromotion.dateFin).getTime();
    const timeLeft = endTime - now;

    if (timeLeft <= 0) {
      this.loadData();
      return;
    }

    this.countdownTime = {
      days: Math.floor(timeLeft / (1000 * 60 * 60 * 24)),
      hours: Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((timeLeft % (1000 * 60)) / 1000),
    };

    this.cdr.markForCheck();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }

    this.dataSubscription = forkJoin({
      bassins: this.bassinService.listeBassin().pipe(
        catchError((err) => {
          console.error('Error loading bassins:', err);
          return of([] as Bassin[]);
        })
      ),
      categories: this.categorieService.listeCategories().pipe(
        catchError((err) => {
          console.error('Error loading categories:', err);
          return of([] as Categorie[]);
        })
      ),
      promotions: this.bassinService.listeBassinsAvecPromotions().pipe(
        catchError((err) => {
          console.error('Error loading promotions:', err);
          return of([] as Bassin[]);
        })
      ),
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data: { bassins: Bassin[]; categories: Categorie[]; promotions: Bassin[] }) => {
          this.processData(data);
          this.applyFilters();
        },
        error: (err) => {
          console.error('Error loading data:', err);
          this.errorMessage = 'Erreur lors du chargement des données';
          this.cdr.markForCheck();
        },
      });
  }

  private processData(data: any): void {
    this.bassins = data.bassins.map((bassin: Bassin) => {
      const bassinAvecPromo = data.promotions.find((p: Bassin) => p.idBassin === bassin.idBassin);
      if (bassinAvecPromo?.promotionActive) {
        bassin.promotion = bassinAvecPromo.promotion;
        bassin.promotionActive = true;
        bassin.prixPromo = this.bassinService.calculerPrixAvecPromotion(bassin);
      } else {
        bassin.promotionActive = false;
        bassin.prixPromo = bassin.prix;
      }
      bassin.isFavorite = this.favoritesService.isInFavorites(bassin.idBassin);
      return bassin;
    });

    if (this.bassins.length > 0) {
      this.maxPrice = Math.max(
        ...this.bassins.map((b) => (b.promotionActive ? b.prixPromo || b.prix : b.prix))
      );
      this.selectedPrice = this.maxPrice;
    }

    this.categories = data.categories.map((cat: Categorie) => ({
      ...cat,
      selected: false,
    }));

    this.updateActivePromotions();
  }

  updateActivePromotions(): void {
    const now = new Date();
    const uniquePromotions = new Map<number, Promotion>();

    this.bassins.forEach((bassin) => {
      if (
        bassin.promotion &&
        bassin.promotionActive &&
        bassin.promotion.idPromotion !== undefined &&
        bassin.promotion.dateFin
      ) {
        const promoId = bassin.promotion.idPromotion;
        if (!uniquePromotions.has(promoId)) {
          uniquePromotions.set(promoId, bassin.promotion);
        }
      }
    });

    this.activePromotions = Array.from(uniquePromotions.values())
      .filter((p) => p.dateFin)
      .sort((a, b) => {
        const dateA = a.dateFin ? new Date(a.dateFin).getTime() : 0;
        const dateB = b.dateFin ? new Date(b.dateFin).getTime() : 0;
        return dateA - dateB;
      });

    this.nextEndingPromotion = this.activePromotions.length > 0 ? this.activePromotions[0] : null;

    if (this.nextEndingPromotion) {
      this.updateCountdown();
    }
  }

  async addToCart(bassin: Bassin, event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();

    if (bassin.statut !== 'DISPONIBLE' && bassin.statut !== 'SUR_COMMANDE') {
      await Swal.fire({
        title: 'Indisponible',
        text: 'Ce bassin n\'est pas disponible actuellement',
        icon: 'error',
        confirmButtonText: 'OK',
      });
      return;
    }

    try {
      this.isLoading = true;

      const existingItem = this.cartItems.find(
        (item) => item.bassinId === bassin.idBassin && !item.isCustomized
      );

      if (existingItem) {
        if (bassin.statut === 'SUR_COMMANDE' && existingItem.quantity >= 1) {
          await Swal.fire({
            title: 'Limite atteinte',
            text: 'Vous ne pouvez commander qu\'un seul bassin sur commande',
            icon: 'warning',
            confirmButtonText: 'OK',
          });
          return;
        }

        if (bassin.statut === 'DISPONIBLE' && existingItem.quantity >= bassin.stock) {
          await Swal.fire({
            title: 'Stock limité',
            text: `Quantité maximale disponible : ${bassin.stock}`,
            icon: 'warning',
            confirmButtonText: 'OK',
          });
          return;
        }
      }

      const promotion = bassin.promotionActive ? bassin.promotion : undefined;

      await lastValueFrom(this.cartService.addBassinToCart(bassin, 1, promotion).pipe(timeout(3000)));

      await Swal.fire({
        title: 'Ajouté au panier !',
        text: 'Le bassin a bien été ajouté à votre panier',
        icon: 'success',
        showConfirmButton: true,
        confirmButtonText: 'Voir mon panier',
        showCancelButton: true,
        cancelButtonText: 'Continuer mes achats',
        timer: 3000,
      });
    } catch (error) {
      console.error('Erreur:', error);
      await Swal.fire({
        title: 'Oups !',
        text: 'Une erreur est survenue lors de l\'ajout au panier',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    } finally {
      this.isLoading = false;
    }
  }

  resetFilters(): void {
    this.minPrice = 0;
    this.selectedPrice = this.maxPrice;
    this.sortOrder = 'asc';
    this.showOnlyPromotions = false;
    this.showAvailable = true;
    this.showOnOrder = true;

    this.categories.forEach((cat) => (cat.selected = false));
    this.selectedCategories = [];

    this.applyFilters();
    this.toastService.showInfo('Filtres réinitialisés');
  }

  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortOrder = select.value;
    this.applyFilters();
  }

  setHoveredProduct(id: number | null): void {
    this.hoveredProduct = id;
    this.cdr.detectChanges();
  }

  showDetails(bassin: Bassin, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/bassin-details', bassin.idBassin]);
  }

  getTauxReduction(bassin: Bassin): number {
    if (bassin.promotion && bassin.promotionActive && bassin.promotion.tauxReduction) {
      return Math.round(bassin.promotion.tauxReduction * 100);
    }
    return 0;
  }

  getAvailabilityStatus(bassin: Bassin): string {
    if (bassin.statut === 'DISPONIBLE') {
      return 'Disponible';
    } else if (bassin.statut === 'SUR_COMMANDE') {
      return 'Sur Commande';
    } else {
      return 'Indisponible';
    }
  }

  handleImageError(event: any): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/default-image.webp';
    imgElement.onerror = null;
  }

  getCategoryName(categoryId?: number): string {
    if (!categoryId) return 'Non catégorisé';
    const category = this.categories.find((cat) => cat.idCategorie === categoryId);
    return category ? category.nomCategorie : 'Non catégorisé';
  }

  getPrixAvecPromotion(bassin: Bassin): number {
    return bassin.prixPromo || bassin.prix;
  }

  getPrixOriginal(bassin: Bassin): number {
    return bassin.prix;
  }

  addToFavorites(bassin: Bassin, event: Event): void {
    event.stopPropagation();

    if (bassin.isFavorite) {
      this.favoritesService.removeFromFavorites(bassin.idBassin);
      bassin.isFavorite = false;
      this.toastService.showInfo('Retiré des favoris');
    } else {
      this.favoritesService.addToFavorites(bassin);
      bassin.isFavorite = true;
      this.toastService.showSuccess('Ajouté aux favoris');
    }

    this.cdr.detectChanges();
  }

 applyFilters(): void {
    this.selectedCategories = this.categories
      .filter((cat) => cat.selected)
      .map((cat) => cat.idCategorie);

    this.filteredBassins = this.bassins.filter((bassin) => {
      const price = bassin.promotionActive ? (bassin.prixPromo || bassin.prix) : bassin.prix;
      if (price === undefined || price < this.minPrice || price > this.selectedPrice) {
        return false;
      }

      const isAvailable = this.showAvailable && bassin.statut === 'DISPONIBLE';
      const isOnOrder = this.showOnOrder && bassin.statut === 'SUR_COMMANDE';
      if (!isAvailable && !isOnOrder) {
        return false;
      }

      if (this.showOnlyPromotions && !bassin.promotionActive) {
        return false;
      }

      if (this.selectedCategories.length > 0 && bassin.categorie) {
        if (!this.selectedCategories.includes(bassin.categorie.idCategorie)) {
          return false;
        }
      }

      // Add keyword search filter
      if (this.searchKeyword.trim()) {
        const keyword = this.searchKeyword.trim().toLowerCase();
        return (
          bassin.nomBassin?.toLowerCase().includes(keyword) ||
          bassin.materiau?.toLowerCase().includes(keyword) ||
          bassin.description?.toLowerCase().includes(keyword)
        );
      }

      return true;
    });

    this.sortBassins();
    this.currentPage = 1;
    this.updatePagination();
    this.updateSliderTrack();
  }

  sortBassins(): void {
    this.filteredBassins.sort((a, b) => {
      const priceA = (a.promotionActive ? a.prixPromo || a.prix : a.prix) || 0;
      const priceB = (b.promotionActive ? b.prixPromo || b.prix : b.prix) || 0;

      switch (this.sortOrder) {
        case 'asc':
          return priceA - priceB;
        case 'desc':
          return priceB - priceA;
        case 'promo':
          if (a.promotionActive && !b.promotionActive) return -1;
          if (!a.promotionActive && b.promotionActive) return 1;
          return priceA - priceB;
        default:
          return 0;
      }
    });
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredBassins.length / this.itemsPerPage);
    this.startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.endIndex = Math.min(this.startIndex + this.itemsPerPage, this.filteredBassins.length);
    this.pagedBassins = this.filteredBassins.slice(this.startIndex, this.endIndex);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  getPages(): number[] {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  toggleFilters(): void {
    this.showFiltersMobile = !this.showFiltersMobile;
  }

  getBassinImageUrl(bassin: Bassin): string {
    if (!bassin) return 'assets/default-image.webp';

    if (bassin.imagesBassin && bassin.imagesBassin.length > 0) {
      const firstImage = bassin.imagesBassin[0];
      if (firstImage && firstImage.imagePath) {
        return `${this.bassinService.getApiUrl()}/imagesBassin/getFS/${encodeURIComponent(
          firstImage.imagePath
        )}`;
      }
    }

    return 'assets/default-image.webp';
  }

  getBassinName(bassin: Bassin): string {
    return bassin?.nomBassin || 'Bassin';
  }

  onImageError(event: any): void {
    event.target.src = 'assets/default-image.webp';
  }

  onSliderChange(type: 'min' | 'max') {
    if (type === 'min' && this.minPrice > this.selectedPrice) {
      this.selectedPrice = this.minPrice;
    } else if (type === 'max' && this.selectedPrice < this.minPrice) {
      this.minPrice = this.selectedPrice;
    }

    this.applyFilters();
  }

  onPriceInputChange() {
    this.minPrice = Math.max(this.minPriceLimit, Math.min(this.selectedPrice, this.minPrice));
    this.selectedPrice = Math.max(this.minPrice, Math.min(this.maxPriceLimit, this.selectedPrice));

    this.applyFilters();
  }

  updateSliderTrack() {
    const sliderContainer = document.querySelector('.at-price-slider-track') as HTMLElement;
    if (sliderContainer) {
      const minPercent = ((this.minPrice - this.minPriceLimit) / (this.maxPriceLimit - this.minPriceLimit)) * 100;
      const maxPercent =
        ((this.selectedPrice - this.minPriceLimit) / (this.maxPriceLimit - this.minPriceLimit)) * 100;
      sliderContainer.style.background = `linear-gradient(to right, #D1D5DB ${minPercent}%, #3B82F6 ${minPercent}%, #3B82F6 ${maxPercent}%, #D1D5DB ${maxPercent}%)`;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }
}