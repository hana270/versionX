import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { NgZone } from '@angular/core';
import * as QRCode from 'qrcode';
import { lastValueFrom, Observable, of } from 'rxjs';
import Swal from 'sweetalert2';
import { Bassin } from '../../../core/models/bassin.models';
import { BassinService } from '../../../core/services/bassin.service';
import { CartService } from '../../../core/services/cart.service';
import { Avis, HistoriqueModification } from '../../../core/models/avis.models';
import { AvisService } from '../../../core/services/avis.service';
import { Accessoire } from '../../../core/models/accessoire.models';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { AuthService } from '../../../core/authentication/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { isPlatformBrowser } from '@angular/common';
import {
  catchError,
  finalize,
  interval,
  map,
  switchMap,
  takeUntil,
  throwError,
  timeout,
  Subject,
} from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { PanierItemRequest } from '../../../core/models/panier-item.model';
import { LoadingService } from '../../../core/services/loading.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-bassin-detail',
  templateUrl: './bassin-detail.component.html',
  styleUrls: ['./bassin-detail.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate(
          '0.4s ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '0.3s ease-in',
          style({ opacity: 0, transform: 'translateY(20px)' })
        ),
      ]),
    ]),
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate('0.5s ease-out', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('0.4s ease-in', style({ transform: 'translateX(-100%)' })),
      ]),
    ]),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BassinDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('customizationDialog') customizationDialog!: ElementRef;
  @ViewChild('modelViewer') modelViewer!: ElementRef;
  isLoading: boolean = false;
  bassin: Bassin | undefined;
  selectedImage: string | undefined;
  isZoomed: boolean = false;
  imagePreviews: string[] = [];
  customizationForm: FormGroup;
  isCustomizing: boolean = false;
  customizationStep: number = 1;
  totalSteps: number = 4;
  isCustomizationComplete: boolean = false;
  customizationSummary: any = {};
  showViewerModal: boolean = false;
  isARMode: boolean = false;
  isGeneratingQR: boolean = false;
  qrCodeImageUrl: string | null = null;
  modelError: boolean = false;
  isMobileDevice: boolean = false;
  safeModelUrl: SafeUrl | null = null;
  safeUsdzUrl: SafeUrl | null = null;

  // Customization options
  listeMateriaux: string[] = [];
  listeDimensions: string[] = [];
  listeAccessoires: Accessoire[] = [];

  activeTab: string = 'description';

  errorMessage = '';
  modelUrl = '';
  usdzUrl = '';

  showDebugInfo = false;
  // Material images and pricing
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

  prixMateriaux: { [key: string]: number } = {
    'Béton fibré haute performance': 50,
    'Polyéthylène haute densité (PEHD)': 60,
    'Composite verre-résine': 70,
    'Acier inoxydable 316L (marine)': 80,
    "Tôle d'acier galvanisé à chaud": 90,
    'PVC renforcé': 100,
    'Membrane EPDM épaisseur 1.5mm': 110,
    'Géomembrane HDPE': 120,
    'Pierre reconstituée': 130,
    'Fibre de carbone': 140,
    'Bâche armée PVC 900g/m²': 150,
    'Polypropylène expansé': 160,
    'Béton polymère': 170,
    'Aluminium anodisé': 180,
    'Titane grade 2': 190,
    'Bois composite': 200,
    'Résine époxy renforcée': 210,
  };

  prixDimensions: { [key: string]: number } = {
    '150x100x80 cm (≈ 1 200L)': 100,
    '180x120x90 cm (≈ 1 944L)': 150,
    '200x150x100 cm (≈ 3 000L)': 200,
    '250x180x120 cm (≈ 5 400L)': 300,
    '300x200x150 cm (≈ 9 000L)': 400,
    '350x250x150 cm (≈ 13 125L)': 500,
    '400x300x200 cm (≈ 24 000L)': 600,
    '500x350x200 cm (≈ 35 000L)': 700,
    '600x400x250 cm (≈ 60 000L)': 800,
    '700x500x300 cm (≈ 105 000L)': 900,
    '800x600x350 cm (≈ 168 000L)': 1000,
    '1000x700x400 cm (≈ 280 000L)': 1200,
  };

  // Color palette
  colorPalette = {
    blues: [
      '#1976D2',
      '#1E88E5',
      '#2196F3',
      '#42A5F5',
      '#64B5F6',
      '#90CAF9',
      '#BBDEFB',
      '#E3F2FD',
    ],
    greens: [
      '#2E7D32',
      '#388E3C',
      '#43A047',
      '#4CAF50',
      '#66BB6A',
      '#81C784',
      '#A5D6A7',
      '#E8F5E9',
    ],
    reds: [
      '#C62828',
      '#D32F2F',
      '#E53935',
      '#F44336',
      '#EF5350',
      '#E57373',
      '#EF9A9A',
      '#FFEBEE',
    ],
    grays: [
      '#212121',
      '#424242',
      '#616161',
      '#757575',
      '#9E9E9E',
      '#BDBDBD',
      '#E0E0E0',
      '#EEEEEE',
    ],
    browns: [
      '#5D4037',
      '#6D4C41',
      '#795548',
      '#8D6E63',
      '#A1887F',
      '#BCAAA4',
      '#D7CCC8',
      '#EFEBE9',
    ],
    purples: [
      '#7B1FA2',
      '#8E24AA',
      '#9C27B0',
      '#AB47BC',
      '#BA68C8',
      '#CE93D8',
      '#E1BEE7',
      '#F3E5F5',
    ],
    yellows: [
      '#F57F17',
      '#F9A825',
      '#FBC02D',
      '#FFEB3B',
      '#FFEE58',
      '#FFF59D',
      '#FFF9C4',
      '#FFFDE7',
    ],
    cyans: [
      '#006064',
      '#00838F',
      '#0097A7',
      '#00BCD4',
      '#26C6DA',
      '#4DD0E1',
      '#80DEEA',
      '#E0F7FA',
    ],
    oranges: [
      '#E65100',
      '#EF6C00',
      '#F57C00',
      '#FB8C00',
      '#FFA726',
      '#FFB74D',
      '#FFCC80',
      '#FFF3E0',
    ],
    pinks: [
      '#AD1457',
      '#C2185B',
      '#D81B60',
      '#E91E63',
      '#EC407A',
      '#F06292',
      '#F8BBD0',
      '#FCE4EC',
    ],
    indigos: [
      '#283593',
      '#303F9F',
      '#3949AB',
      '#3F51B5',
      '#5C6BC0',
      '#7986CB',
      '#C5CAE9',
      '#E8EAF6',
    ],
    teals: [
      '#004D40',
      '#00695C',
      '#00796B',
      '#009688',
      '#26A69A',
      '#4DB6AC',
      '#80CBC4',
      '#E0F2F1',
    ],
    limes: [
      '#827717',
      '#9E9D24',
      '#AFB42B',
      '#CDDC39',
      '#D4E157',
      '#DCE775',
      '#F0F4C3',
      '#F9FBE7',
    ]
  };

  selectedColor: string = '#1976D2';
  quantity: number = 1;
  isBrowser: boolean = false;

  // Reviews
  avisForm!: FormGroup;
  isLoggedIn: boolean = false;
  username: string = '';
  avisList: Avis[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 4;
  editingAvis: Avis | null = null;

  // Promotion
  timeLeftForPromo: any = null;
  private destroy$ = new Subject<void>();
  private timer: any;

  constructor(
    private route: ActivatedRoute,
    private cartService: CartService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private authService: AuthService,
    private avisService: AvisService,
    private jwtHelper: JwtHelperService,
    private authState: AuthStateService,
    private toastService: ToastService,
    private bassinService: BassinService,
    private loadingService: LoadingService,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.isMobileDevice =
      this.isBrowser && /Android|iPhone|iPad/i.test(navigator.userAgent);
    this.customizationForm = this.fb.group({
      materiau: ['', Validators.required],
      dimension: ['', Validators.required],
      couleur: [this.selectedColor, Validators.required],
      accessoires: [[]],
    });
  }

  ngOnInit(): void {
    this.isMobileDevice = this.checkIfMobile();
    this.initAuthState();
    this.initAvisForm();
    this.loadBassinDetails();
    this.setupPromotionCheck();
  }

  ngAfterViewInit(): void {
    this.updateCustomizationUI();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timer) clearInterval(this.timer);
  }

  private initAuthState(): void {
    this.isLoggedIn = this.authState.isLoggedIn;
    if (this.isLoggedIn) {
      const token = this.authState.token;
      if (token) {
        const decoded = this.jwtHelper.decodeToken(token);
        this.username = decoded.sub || '';
      }
    }
  }

  private loadBassinDetails(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.loadingService.show();
    this.bassinService
      .consulterBassin(+id)
      .pipe(
        switchMap((bassin) => {
          if (!bassin) throw new Error('Bassin non trouvé');
          this.bassin = bassin;
          this.loadImages(bassin);
          this.loadCustomizationOptions(bassin.idBassin);
          this.loadAvis(bassin.idBassin);
          this.load3DModel(bassin);
          return this.bassinService.listeBassinsAvecPromotions().pipe(
            map((promotions) => {
              const bassinPromo = promotions.find(
                (p) => p.idBassin === bassin.idBassin
              );
              if (bassinPromo?.promotion) {
                this.bassin!.promotion = bassinPromo.promotion;
                this.checkPromotionStatus();
              }
              return bassin;
            })
          );
        }),
        catchError((err) => {
          this.toastService.showError(
            'Impossible de charger les détails du bassin'
          );
          return throwError(() => err);
        }),
        finalize(() => {
          this.loadingService.hide();
          this.cdr.detectChanges();
        })
      )
      .subscribe();
  }

  // Nouvelle méthode pour vérifier l'accessibilité de l'URL
  private checkModelUrl(url: string): Observable<void> {
    return this.http.head(url, { observe: 'response' }).pipe(
      map(() => {
        return;
      }),
      catchError((error) => {
        return throwError(
          () => new Error("Erreur lors de la vérification de l'URL du modèle")
        );
      })
    );
  }

  // Modifiez les méthodes viewIn3D et viewInAR :
  viewIn3D(): void {
    if (!this.bassin?.image3DPath) {
      this.toastService.showError('Aucun modèle 3D disponible pour ce produit');
      return;
    }

    // Vérification explicite que bassin n'est pas undefined
    if (!this.bassin) {
      this.toastService.showError('Produit non disponible');
      return;
    }

    this.showViewerModal = true;
    this.isARMode = false;
    this.isLoading = true;
    this.modelError = false;
    this.errorMessage = '';

    this.load3DModel(this.bassin);
  }

  viewInAR(): void {
    if (!this.bassin?.image3DPath) {
      this.toastService.showError('Aucun modèle 3D disponible pour ce produit');
      return;
    }

    // Vérification explicite que bassin n'est pas undefined
    if (!this.bassin) {
      this.toastService.showError('Produit non disponible');
      return;
    }

    this.showViewerModal = true;
    this.isARMode = true;
    this.isLoading = true;
    this.modelError = false;
    this.errorMessage = '';

    this.load3DModel(this.bassin);
    this.generateQRCode();
  }

  async addToCart(): Promise<void> {
    if (!this.bassin) return;
    if (
      this.bassin.statut === 'DISPONIBLE' &&
      this.quantity > this.bassin.stock
    ) {
      this.toastService.showError(
        `Stock insuffisant (${this.bassin.stock} disponible(s))`
      );
      return;
    }
    this.loadingService.show();
    try {
      await lastValueFrom(
        this.cartService
          .addBassinToCart(
            this.bassin,
            this.quantity,
            this.bassin.promotionActive ? this.bassin.promotion : undefined
          )
          .pipe(timeout(3000))
      );
      const result = await Swal.fire({
        title: 'Ajouté au panier!',
        html: `${this.quantity} bassin(s) <strong>${this.bassin.nomBassin}</strong> ajouté(s)`,
        icon: 'success',
        showConfirmButton: true,
        confirmButtonText: 'Voir panier',
        showCancelButton: true,
        cancelButtonText: 'Continuer',
        timer: 5000,
      });
      if (result.isConfirmed) this.router.navigate(['/cart']);
    } catch (error) {
      this.toastService.showError("Erreur lors de l'ajout au panier");
    } finally {
      this.loadingService.hide();
      this.cdr.detectChanges();
    }
  }

 async addCustomToCart(): Promise<void> {
  if (!this.bassin || !this.isCustomizationComplete) return;
  
  this.loadingService.show();
  try {
    // Calcul du prix total sans promotion
    const prixMateriau = this.prixMateriaux[this.customizationSummary.materiau] || 0;
    const prixDimension = this.prixDimensions[this.customizationSummary.dimension] || 0;
    const prixAccessoires = this.customizationSummary.accessoires?.reduce(
      (sum: number, acc: Accessoire) => sum + (acc.prixAccessoire || 0), 0) || 0;
    
    // Prix de base du bassin (sans promotion)
    const prixBase = this.bassin.prix;
    
    // Prix total personnalisé
    const prixTotal = prixBase + prixMateriau + prixDimension + prixAccessoires;
    
    const request: PanierItemRequest = {
      bassinId: this.bassin.idBassin,
      quantity: this.customQuantity,
      isCustomized: true,
      nomBassin: this.bassin.nomBassin,
      imageUrl: this.customizationSummary.imageUrl || this.selectedImage,
      status: 'SUR_COMMANDE',
      materiauSelectionne: this.customizationSummary.materiau || 'Standard',
      dimensionSelectionnee: this.customizationSummary.dimension || 'Standard',
      couleurSelectionnee: this.customizationSummary.couleur,
      accessoireIds: this.customizationSummary.accessoires?.map(
        (a: Accessoire) => a.idAccessoire) || [],
      prixOriginal: prixBase,
      prixMateriau: prixMateriau,
      prixDimension: prixDimension,
      prixAccessoires: prixAccessoires,
      prixEstime: prixTotal,
      dureeFabrication: `${this.customizationSummary.dureeFabrication} jours`,
      // Explicitement désactiver la promotion pour les items personnalisés
      promotionActive: false,
      tauxReduction: 0
    };

    await lastValueFrom(
      this.cartService.addItemToCart(request).pipe(timeout(3000))
    );

    // Calcul du total pour l'affichage
    const total = prixTotal * this.customQuantity;

    const result = await Swal.fire({
      title: 'Personnalisation ajoutée!',
      html: `
        <div style="text-align: left;">
          <p><strong>Produit:</strong> ${this.bassin.nomBassin} (Personnalisé)</p>
          <p><strong>Quantité:</strong> ${this.customQuantity}</p>
          <p><strong>Matériau:</strong> ${this.customizationSummary.materiau || 'Standard'} (+${prixMateriau.toFixed(2)} TND)</p>
          <p><strong>Dimension:</strong> ${this.customizationSummary.dimension || 'Standard'} (+${prixDimension.toFixed(2)} TND)</p>
          <p><strong>Couleur:</strong> <span style="background-color: ${this.customizationSummary.couleur}; 
            width: 20px; height: 20px; display: inline-block; border-radius: 50%;"></span> 
            ${this.getColorName(this.customizationSummary.couleur)}</p>
          <p><strong>Accessoires:</strong> ${this.customizationSummary.accessoires?.length ? 
            this.customizationSummary.accessoires.map((a: { nomAccessoire: any; }) => a.nomAccessoire).join(', ') : 'Aucun'} 
            (+${prixAccessoires.toFixed(2)} TND)</p>
          <p><strong>Prix unitaire:</strong> ${prixTotal.toFixed(2)} TND</p>
          <p><strong>Total:</strong> <strong>${total.toFixed(2)} TND</strong></p>
        </div>
      `,
      icon: 'success',
      showConfirmButton: true,
      confirmButtonText: 'Commander',
      showCancelButton: true,
      cancelButtonText: 'Continuer',
    });

    if (result.isConfirmed) {
      this.router.navigate(['/checkout']);
    }
  } catch (error) {
    this.toastService.showError(
      "Erreur lors de l'ajout de la personnalisation"
    );
  } finally {
    this.loadingService.hide();
    this.isCustomizationComplete = false;
    this.isCustomizing = false;
    this.cdr.detectChanges();
  }
}

  private getCustomizationSuccessHtml(): string {
    return `
      <div style="text-align: left;">
        <p><strong>Produit:</strong> ${this.bassin?.nomBassin}</p>
        <p><strong>Matériau:</strong> ${
          this.customizationSummary.materiau || 'Standard'
        }</p>
        <p><strong>Dimension:</strong> ${
          this.customizationSummary.dimension || 'Standard'
        }</p>
        <p><strong>Couleur:</strong> <span style="background-color: ${
          this.customizationSummary.couleur
        }; width: 20px; height: 20px; display: inline-block; border-radius: 50%;"></span> ${
      this.customizationSummary.couleur
    }</p>
        <p><strong>Accessoires:</strong> ${
          this.customizationSummary.accessoires?.length
            ? this.customizationSummary.accessoires
                .map((a: Accessoire) => a.nomAccessoire)
                .join(', ')
            : 'Aucun'
        }</p>
        <p><strong>Prix total:</strong> ${
          this.customizationSummary.prixEstime
        } TND</p>
      </div>
    `;
  }

  private initAvisForm(): void {
    this.avisForm = this.fb.group({
      nom: [
        { value: this.username || '', disabled: true },
        Validators.required,
      ],
      message: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(500),
        ],
      ],
      note: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
    });
  }

  private setupPromotionCheck(): void {
    if (this.isBrowser) {
      interval(30000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.checkAndUpdatePromotion();
        });
    }
  }

  private loadImages(bassin: Bassin): void {
    if (bassin.imagesBassin?.length) {
      this.imagePreviews = bassin.imagesBassin.map(
        (img) =>
          `${this.bassinService.getApiUrl()}/imagesBassin/getFS/${
            img.imagePath
          }`
      );
      this.selectedImage = this.imagePreviews[0];
    } else {
      this.selectedImage = 'assets/default-image.webp';
      this.imagePreviews = ['assets/default-image.webp'];
    }
  }

  private loadCustomizationOptions(idBassin: number): void {
    this.bassinService.getBassinPersonnaliseOptions(idBassin).subscribe({
      next: (options) => {
        this.listeMateriaux = options.materiaux || [];
        this.listeDimensions = options.dimensions || [];
        this.listeAccessoires = options.accessoires || [];
        this.bassin!.hasCustomizationOptions =
          this.listeMateriaux.length > 0 ||
          this.listeDimensions.length > 0 ||
          this.listeAccessoires.length > 0;
        this.initCustomizationForm();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur options personnalisation', err);
        this.bassin!.hasCustomizationOptions = false;
        this.initCustomizationForm();
        this.cdr.detectChanges();
      },
    });
  }

  private initCustomizationForm(): void {
    this.customizationForm = this.fb.group({
      materiau: [
        this.listeMateriaux[0] || '',
        this.listeMateriaux.length ? Validators.required : [],
      ],
      dimension: [
        this.listeDimensions[0] || '',
        this.listeDimensions.length ? Validators.required : [],
      ],
      couleur: [this.selectedColor, Validators.required],
      accessoires: [[]],
    });
    this.totalSteps = this.calculateTotalSteps();
  }

  private calculateTotalSteps(): number {
    let steps = 1; // Color step is always present
    if (this.listeMateriaux.length) steps++;
    if (this.listeDimensions.length) steps++;
    if (this.listeAccessoires.length) steps++;
    return steps;
  }

  private updateCustomizationUI(): void {
    if (!this.customizationDialog?.nativeElement) return;

    const dialog = this.customizationDialog.nativeElement as HTMLElement;
    const stepTitle = dialog.querySelector(
      '.customization-step-title'
    ) as HTMLElement;
    const progressBar = dialog.querySelector('.progress-bar') as HTMLElement;
    const materialSection = dialog.querySelector(
      '.material-section'
    ) as HTMLElement;
    const dimensionSection = dialog.querySelector(
      '.dimension-section'
    ) as HTMLElement;
    const colorSection = dialog.querySelector('.color-section') as HTMLElement;
    const accessorySection = dialog.querySelector(
      '.accessory-section'
    ) as HTMLElement;

    // Update step title and progress
    const stepTitles = [
      'Choix du matériau',
      'Choix des dimensions',
      'Choix de la couleur',
      'Choix des accessoires',
    ];
    let currentStepIndex = this.customizationStep - 1;
    if (!this.listeMateriaux.length) currentStepIndex++;
    if (!this.listeDimensions.length) currentStepIndex++;
    if (
      !this.listeAccessoires.length &&
      this.customizationStep === this.totalSteps
    )
      currentStepIndex = 2; // Color step

    if (stepTitle) {
      stepTitle.textContent =
        stepTitles[currentStepIndex] || `Étape ${this.customizationStep}`;
    }

    if (progressBar) {
      const progress = (this.customizationStep / this.totalSteps) * 100;
      progressBar.style.width = `${progress}%`;
    }

    // Show/hide sections based on step
    if (materialSection)
      materialSection.style.display =
        this.customizationStep === 1 && this.listeMateriaux.length
          ? 'block'
          : 'none';
    if (dimensionSection)
      dimensionSection.style.display =
        this.customizationStep === (this.listeMateriaux.length ? 2 : 1) &&
        this.listeDimensions.length
          ? 'block'
          : 'none';
    if (colorSection)
      colorSection.style.display =
        this.customizationStep ===
        (this.listeMateriaux.length
          ? this.listeDimensions.length
            ? 3
            : 2
          : this.listeDimensions.length
          ? 2
          : 1)
          ? 'block'
          : 'none';
    if (accessorySection)
      accessorySection.style.display =
        this.customizationStep === this.totalSteps &&
        this.listeAccessoires.length
          ? 'block'
          : 'none';

    // Update selected material image
    const selectedMaterial = this.customizationForm.get('materiau')?.value;
    const materialImage = dialog.querySelector(
      '.material-preview'
    ) as HTMLImageElement;
    if (
      materialImage &&
      selectedMaterial &&
      this.materiauxImages[selectedMaterial]
    ) {
      materialImage.src = this.materiauxImages[selectedMaterial];
      materialImage.alt = `Aperçu du matériau ${selectedMaterial}`;
    }

    // Update selected color preview
    const selectedColor = this.customizationForm.get('couleur')?.value;
    const colorPreview = dialog.querySelector('.color-preview') as HTMLElement;
    if (colorPreview && selectedColor) {
      colorPreview.style.backgroundColor = selectedColor;
    }

    // Update accessory selection state
    const accessoryItems = dialog.querySelectorAll(
      '.accessory-item'
    ) as NodeListOf<HTMLElement>;
    const selectedAccessoires =
      this.customizationForm.get('accessoires')?.value || [];
    accessoryItems.forEach((item) => {
      const id = parseInt(item.dataset['id'] || '0', 10);
      item.classList.toggle(
        'selected',
        selectedAccessoires.some((a: Accessoire) => a.idAccessoire === id)
      );
    });

    this.cdr.detectChanges();
  }

  private checkPromotionStatus(): void {
    if (!this.bassin?.promotion) return;
    const now = new Date();
    const startDate = new Date(this.bassin.promotion.dateDebut);
    const endDate = new Date(this.bassin.promotion.dateFin);
    this.bassin.promotionActive = now >= startDate && now <= endDate;
    if (this.bassin.promotionActive) {
      this.bassin.prixPromo =
        this.bassin.prix * ((1 - this.bassin.promotion.tauxReduction) );
      this.calculateTimeLeft(endDate);
    } else {
      this.bassin.prixPromo = this.bassin.prix;
    }
    this.cdr.detectChanges();
  }

  private calculateTimeLeft(endDate: Date): void {
    this.ngZone.runOutsideAngular(() => {
      this.timer = setInterval(() => {
        this.ngZone.run(() => {
          const now = new Date();
          const diff = endDate.getTime() - now.getTime();
          if (diff <= 0) {
            clearInterval(this.timer);
            if (this.bassin) {
              this.bassin.promotionActive = false;
              this.bassin.prixPromo = this.bassin.prix;
            }
            this.timeLeftForPromo = null;
            this.cdr.detectChanges();
            return;
          }
          this.timeLeftForPromo = {
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor(
              (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            ),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000),
          };
          this.cdr.detectChanges();
        });
      }, 1000);
    });
  }

  private checkAndUpdatePromotion(): void {
    if (!this.bassin?.promotion) return;
    const now = new Date();
    const startDate = new Date(this.bassin.promotion.dateDebut);
    const endDate = new Date(this.bassin.promotion.dateFin);
    const isActive = now >= startDate && now <= endDate;
    if (isActive !== this.bassin.promotionActive) {
      this.bassin.promotionActive = isActive;
      this.bassin.prixPromo = isActive
        ? this.bassin.prix * ((1 - this.bassin.promotion.tauxReduction / 100))
        : this.bassin.prix;
      if (isActive) {
        this.calculateTimeLeft(endDate);
      } else {
        clearInterval(this.timer);
        this.timeLeftForPromo = null;
      }
      this.cdr.detectChanges();
    }
  }
 calculateAverageRating(): number {
    if (this.avisList.length === 0) return 0; // Si aucun avis, retourne 0

    const total = this.avisList.reduce((sum, avis) => sum + avis.note, 0);
    return total / this.avisList.length;
  }
  private loadAvis(idBassin: number): void {
    this.avisService.getAvisByBassin(idBassin).subscribe({
      next: (avis) => {
        this.avisList = avis.map((a) => ({
          ...a,
          showHistorique: false,
        }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.showError('Impossible de charger les avis');
      },
    });
  }

  onSubmitAvis(): void {
    if (this.avisForm.invalid) return;
    const avis: Avis = this.avisForm.getRawValue();
    const idBassin = this.route.snapshot.paramMap.get('id');
    if (!idBassin) return;
    this.avisService.addAvis(avis, +idBassin).subscribe({
      next: (newAvis) => {
        this.avisList.push(newAvis);
        this.avisForm.reset({ nom: this.username, note: 1 });
        this.toastService.showSuccess('Votre avis a été ajouté avec succès');
        this.cdr.detectChanges();
      },
      error: () =>
        this.toastService.showError(
          "Une erreur est survenue lors de l'ajout de l'avis"
        ),
    });
  }

  editAvis(avis: Avis): void {
    this.editingAvis = avis;
    this.avisForm.patchValue({
      nom: this.username,
      message: avis.message,
      note: avis.note,
    });
    this.cdr.detectChanges();
  }

  updateAvis(): void {
    if (!this.editingAvis || this.avisForm.invalid) return;
    const modification: HistoriqueModification = {
      ancienneNote: this.editingAvis.note,
      ancienMessage: this.editingAvis.message,
      ancienNom: this.editingAvis.nom,
      dateModification: new Date().toISOString(),
    };
    const updatedAvis: Avis = {
      ...this.avisForm.getRawValue(),
      idAvis: this.editingAvis.idAvis,
      userId: this.editingAvis.userId,
      dateSoumission: this.editingAvis.dateSoumission,
      historiqueModifications: [
        ...(this.editingAvis.historiqueModifications || []),
        modification,
      ],
    };
    this.avisService
      .updateAvis(this.editingAvis.idAvis, updatedAvis)
      .subscribe({
        next: (updated) => {
          const index = this.avisList.findIndex(
            (a) => a.idAvis === this.editingAvis!.idAvis
          );
          if (index !== -1) this.avisList[index] = updated;
          this.editingAvis = null;
          this.avisForm.reset({ nom: this.username, note: 1 });
          this.toastService.showSuccess('Votre avis a été mis à jour');
          this.cdr.detectChanges();
        },
        error: (err) => {
          let errorMessage = 'Une erreur est survenue';
          if (err.status === 403)
            errorMessage = "Vous n'êtes pas autorisé à modifier cet avis";
          if (err.status === 404) errorMessage = 'Avis non trouvé';
          this.toastService.showError(errorMessage);
        },
      });
  }

  deleteAvis(idAvis: number): void {
    Swal.fire({
      title: 'Confirmer la suppression',
      text: 'Voulez-vous vraiment supprimer cet avis?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Oui, supprimer',
    }).then((result) => {
      if (result.isConfirmed) {
        this.avisService.deleteAvis(idAvis).subscribe({
          next: () => {
            this.avisList = this.avisList.filter((a) => a.idAvis !== idAvis);
            this.toastService.showSuccess('Avis supprimé avec succès');
            this.cdr.detectChanges();
          },
          error: (err) => {
            let errorMessage = 'Une erreur est survenue';
            if (err.status === 403)
              errorMessage = "Vous n'êtes pas autorisé à supprimer cet avis";
            if (err.status === 404) errorMessage = 'Avis non trouvé';
            this.toastService.showError(errorMessage);
          },
        });
      }
    });
  }

  cancelEdit(): void {
    this.editingAvis = null;
    this.avisForm.reset({ nom: this.username, note: 1 });
    this.cdr.detectChanges();
  }

  toggleHistorique(avis: Avis): void {
    if (this.isCurrentUserAuthor(avis)) {
      avis.showHistorique = !avis.showHistorique;
      this.cdr.detectChanges();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
    this.cdr.detectChanges();
  }

  previousPage(): void {
    if (this.currentPage > 1) this.currentPage--;
    this.cdr.detectChanges();
  }

  get totalPages(): number {
    return Math.ceil(this.avisList.length / this.itemsPerPage);
  }

  get paginatedAvis(): Avis[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.avisList.slice(startIndex, startIndex + this.itemsPerPage);
  }

  isCurrentUserAuthor(avis: Avis): boolean {
    return (
      this.isLoggedIn &&
      (avis.nom === this.username ||
        avis.userId === this.authState.currentUserId)
    );
  }

  getRatingLabel(note: number): string {
    switch (note) {
      case 1:
        return 'Mauvais';
      case 2:
        return 'Moyen';
      case 3:
        return 'Bon';
      case 4:
        return 'Très bon';
      case 5:
        return 'Excellent';
      default:
        return '';
    }
  }

  changeImage(imageUrl: string): void {
    this.selectedImage = imageUrl;
    this.isZoomed = false;
    this.cdr.detectChanges();
  }

  toggleZoom(): void {
    this.isZoomed = !this.isZoomed;
    this.cdr.detectChanges();
  }

  handleImageError(event: any): void {
    event.target.src = 'assets/default-image.webp';
  }

  startCustomization(): void {
    if (!this.bassin?.hasCustomizationOptions) return;
    this.isCustomizing = true;
    this.customizationStep = 1;
    this.initCustomizationForm();
    this.cdr.detectChanges();
  }

  cancelCustomization(): void {
    this.isCustomizing = false;
    this.customizationStep = 1;
    this.isCustomizationComplete = false;
    this.customizationForm.reset();
    this.cdr.detectChanges();
  }

  nextStep(): void {
    if (
      this.customizationStep === 1 &&
      this.listeMateriaux.length &&
      !this.customizationForm.get('materiau')?.value
    ) {
      this.toastService.showError('Veuillez sélectionner un matériau');
      return;
    }
    if (
      this.customizationStep === (this.listeMateriaux.length ? 2 : 1) &&
      this.listeDimensions.length &&
      !this.customizationForm.get('dimension')?.value
    ) {
      this.toastService.showError('Veuillez sélectionner une dimension');
      return;
    }
    if (this.customizationStep < this.totalSteps) {
      this.customizationStep++;
    } else {
      this.completeCustomization();
    }
    this.cdr.detectChanges();
  }

  previousStep(): void {
    if (this.customizationStep > 1) {
      this.customizationStep--;
    } else {
      this.cancelCustomization();
    }
    this.cdr.detectChanges();
  }

  selectMaterial(materiau: string): void {
    this.customizationForm.get('materiau')?.setValue(materiau);
    this.cdr.detectChanges();
  }

  selectDimension(dimension: string): void {
    this.customizationForm.get('dimension')?.setValue(dimension);
    this.cdr.detectChanges();
  }

  toggleAccessoire(accessoire: Accessoire): void {
    const currentAccessoires =
      this.customizationForm.get('accessoires')?.value || [];
    const index = currentAccessoires.findIndex(
      (a: Accessoire) => a.idAccessoire === accessoire.idAccessoire
    );
    if (index === -1) {
      currentAccessoires.push(accessoire);
    } else {
      currentAccessoires.splice(index, 1);
    }
    this.customizationForm.get('accessoires')?.setValue(currentAccessoires);
    this.cdr.detectChanges();
  }

  isAccessoireSelected(accessoire: Accessoire): boolean {
    return this.customizationForm
      .get('accessoires')
      ?.value.some(
        (a: Accessoire) => a.idAccessoire === accessoire.idAccessoire
      );
  }

  selectColor(color: string): void {
    this.selectedColor = color;
    this.customizationForm.get('couleur')?.setValue(color);
    this.cdr.detectChanges();
  }

  private completeCustomization(): void {
    if (!this.bassin) return;
    const formValue = this.customizationForm.getRawValue();
    const prixMateriau = this.prixMateriaux[formValue.materiau] || 0;
    const prixDimension = this.prixDimensions[formValue.dimension] || 0;
    const prixAccessoires =
      formValue.accessoires?.reduce(
        (sum: number, acc: Accessoire) => sum + (acc.prixAccessoire || 0),
        0
      ) || 0;
    const prixBase = this.bassin.prix || 0;
    const prixEstime =
      prixBase + prixMateriau + prixDimension + prixAccessoires;
    this.customizationSummary = {
      materiau: formValue.materiau || 'Standard',
      dimension: formValue.dimension || 'Standard',
      couleur: formValue.couleur,
      accessoires: formValue.accessoires || [],
      prixEstime,
      dureeFabrication: 7, // Example duration, adjust as needed
    };
    this.isCustomizationComplete = true;
    this.isCustomizing = false;
    this.cdr.detectChanges();
  }

  editCustomization(): void {
    this.isCustomizationComplete = false;
    this.isCustomizing = true;
    this.customizationStep = 1;
    this.cdr.detectChanges();
  }

  increaseQuantity(): void {
    if (this.bassin?.stock && this.quantity < this.bassin.stock) {
      this.quantity++;
      this.cdr.detectChanges();
    }
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
      this.cdr.detectChanges();
    }
  }

  restrictQuantity(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = parseInt(input.value, 10);
    if (isNaN(value) || value < 1) {
      value = 1;
    } else if (this.bassin?.stock && value > this.bassin.stock) {
      value = this.bassin.stock;
    }
    this.quantity = value;
    input.value = value.toString();
    this.cdr.detectChanges();
  }

  hasActivePromotion(bassin: Bassin | undefined): boolean {
    return !!bassin?.promotionActive;
  }

  getPromotionPercentage(bassin: Bassin | undefined): string {
    if (!bassin?.promotionActive || !bassin.promotion) return '';
    return `-${bassin.promotion.tauxReduction*100}%`;
  }

  getDisplayPrice(bassin: Bassin | undefined): string {
    if (!bassin) return 'N/A';
    return bassin.promotionActive && bassin.prixPromo
      ? `${bassin.prixPromo.toFixed(3)} TND`
      : `${bassin.prix?.toFixed(3) ?? 'N/A'} TND`;
  }

  getOriginalPrice(bassin: Bassin | undefined): string {
    return bassin && bassin.promotionActive && bassin.prix
      ? `${bassin.prix.toFixed(3)} TND`
      : '';
  }

  getFabricationTime(): string {
    return this.bassin?.surCommande ? this.bassin.dureeFabricationDisplay : '';
  }

  selectTab(tab: string): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  isClient(): boolean {
    return this.authService.isClient();
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /********************** */

  // Méthode corrigée pour charger le modèle 3D
  private load3DModel(bassin: Bassin): void {
    if (!bassin.image3DPath) {
      this.handleModelError('Aucun modèle 3D disponible pour ce produit');
      return;
    }

    try {
      // Construire les URLs des modèles
      let modelPath = bassin.image3DPath;

      // Vérifier si c'est une URL GitHub et la convertir
      if (modelPath.includes('github.com')) {
        modelPath = this.convertGithubUrl(modelPath);
      } else if (!modelPath.startsWith('http')) {
        // Si ce n'est pas une URL complète, construire l'URL avec l'API
        modelPath = `${this.bassinService.getApiUrl()}/models3D/getFS/${modelPath}`;
      }

      this.modelUrl = modelPath;

      // Générer l'URL USDZ pour iOS
      this.usdzUrl = this.generateUsdzUrl(modelPath);

      console.log('Model URL:', this.modelUrl);
      console.log('USDZ URL:', this.usdzUrl);

      // Vérifier la disponibilité du modèle
      this.checkModelAvailability(this.modelUrl).subscribe({
        next: (isAvailable) => {
          if (isAvailable) {
            this.isLoading = false;
            this.modelError = false;
            this.cdr.detectChanges();
          } else {
            this.handleModelError("Le modèle 3D n'est pas accessible");
          }
        },
        error: (err) => {
          console.error('Erreur lors de la vérification du modèle:', err);
          this.handleModelError(
            'Impossible de vérifier la disponibilité du modèle 3D'
          );
        },
      });
    } catch (error) {
      console.error('Erreur lors du chargement du modèle 3D:', error);
      this.handleModelError("Erreur lors de l'initialisation du modèle 3D");
    }
  }

  // Méthode pour convertir les URLs GitHub
  private convertGithubUrl(url: string): string {
    if (!url) return '';

    if (url.includes('github.com')) {
      return url
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
    }
    return url;
  }

  // Générer l'URL USDZ pour iOS
  private generateUsdzUrl(modelUrl: string): string {
    if (!modelUrl) return '';

    // Remplacer l'extension par .usdz
    return modelUrl.replace(/\.(glb|gltf)$/i, '.usdz');
  }

  // Vérifier la disponibilité du modèle
  private checkModelAvailability(modelUrl: string): Observable<boolean> {
    return this.http
      .head(modelUrl, {
        observe: 'response',
        // Ajouter des headers si nécessaire
        headers: {
          Accept: '*/*',
        },
      })
      .pipe(
        map((response) => {
          console.log('Model check response:', response.status);
          return response.status === 200;
        }),
        catchError((error) => {
          console.error('Erreur lors de la vérification du modèle:', error);
          return of(false);
        }),
        timeout(10000), // Timeout de 10 secondes
        catchError(() => of(false))
      );
  }

  // Gérer les erreurs du modèle
  private handleModelError(message: string): void {
    this.isLoading = false;
    this.modelError = true;
    this.errorMessage = message;
    this.toastService.showError(message);
    this.cdr.detectChanges();
  }

  // Callback quand le modèle est chargé avec succès
  onModelLoad(): void {
    console.log('Modèle 3D chargé avec succès');
    this.isLoading = false;
    this.modelError = false;
    this.cdr.detectChanges();
  }

  // Callback quand il y a une erreur de chargement
  onModelError(event?: any): void {
    console.error('Erreur lors du chargement du modèle 3D:', event);
    this.handleModelError('Erreur lors du chargement du modèle 3D');
  }

  // Réessayer le chargement du modèle
  retryLoadModel(): void {
    if (!this.bassin) {
      this.toastService.showError('Produit non disponible');
      return;
    }

    this.isLoading = true;
    this.modelError = false;
    this.errorMessage = '';
    this.cdr.detectChanges();

    setTimeout(() => {
      if (this.bassin) {
        // Vérification supplémentaire
        this.load3DModel(this.bassin);
      }
    }, 500);
  }

  // Fermer la modal
  closeViewerModal(): void {
    this.showViewerModal = false;
    this.isARMode = false;
    this.isLoading = false;
    this.modelError = false;
    this.errorMessage = '';
    this.modelUrl = '';
    this.usdzUrl = '';
    this.qrCodeImageUrl = '';
    this.cdr.detectChanges();
  }

  // Basculer entre 3D et AR
  toggleViewerMode(): void {
    this.isARMode = !this.isARMode;

    if (this.isARMode) {
      this.generateQRCode();
    }

    this.cdr.detectChanges();
  }


  // Télécharger le QR Code
  downloadQRCode(): void {
    if (this.qrCodeImageUrl) {
      const link = document.createElement('a');
      link.download = `qr-code-${this.bassin?.nomBassin || 'model'}.png`;
      link.href = this.qrCodeImageUrl;
      link.click();
    }
  }

  // Vérifier si c'est un appareil mobile
  private checkIfMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }
private async generateQRCode(): Promise<void> {
    if (!this.modelUrl) {
        this.toastService.showError('Aucun modèle 3D disponible pour générer le QR Code');
        return;
    }

    this.isGeneratingQR = true;
    this.cdr.detectChanges();

    try {
        // Créer une URL spéciale pour l'AR qui fonctionne avec iOS et Android
        const arUrl = this.createARUrl(this.modelUrl);
        
        // Générer le QR Code avec une taille plus grande et une meilleure marge
        const qrCodeDataUrl = await QRCode.toDataURL(arUrl, {
            width: 400,  // Augmenter la taille pour une meilleure lisibilité
            margin: 4,   // Marge plus grande
            color: {
                dark: '#000000',  // Couleur noire pour les modules
                light: '#ffffff00' // Fond transparent
            },
            errorCorrectionLevel: 'H'  // Correction d'erreur haute pour plus de fiabilité
        });

        this.qrCodeImageUrl = qrCodeDataUrl;
    } catch (error) {
        console.error('Erreur lors de la génération du QR Code:', error);
        this.toastService.showError('Erreur lors de la génération du QR Code');
    } finally {
        this.isGeneratingQR = false;
        this.cdr.detectChanges();
    }
}

private createARUrl(modelUrl: string): string {
    // Pour iOS (Quick Look)
    if (this.isIOSDevice()) {
        return `https://usdz.webxr.run?url=${encodeURIComponent(modelUrl)}`;
    }
    
    // Pour Android et autres appareils
    return `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_only`;
}

private isIOSDevice(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
// Méthode pour vérifier si on peut passer à l'étape suivante
canProceedToNextStep(): boolean {
  switch(this.customizationStep) {
    case 1: 
      return this.listeMateriaux.length === 0 || !!this.customizationForm.get('materiau')?.value;
    case 2:
      return this.listeDimensions.length === 0 || !!this.customizationForm.get('dimension')?.value;
    case 3:
      return true; // Pour les accessoires, la sélection est optionnelle
    case 4:
      return true; // Pour la couleur, toujours sélectionnée
    default:
      return false;
  }
}

// Méthode pour fermer la personnalisation
closeCustomization(): void {
  this.isCustomizationComplete = false;
  this.isCustomizing = false;
  this.customizationStep = 1;
  this.cdr.detectChanges();
}

// Propriétés pour la quantité personnalisée
customQuantity: number = 1;

// Méthodes pour gérer la quantité personnalisée
increaseCustomQuantity(): void {
  this.customQuantity++;
}

decreaseCustomQuantity(): void {
  if (this.customQuantity > 1) {
    this.customQuantity--;
  }
}

validateCustomQuantity(): void {
  if (this.customQuantity < 1) {
    this.customQuantity = 1;
  }}
  
  
  getColorName(color: string): string {
    const colorNames: { [key: string]: string } = {
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

    return colorNames[color] || 'Couleur inconnue';
  }
}