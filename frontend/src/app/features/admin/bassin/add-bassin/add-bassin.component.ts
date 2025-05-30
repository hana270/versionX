import { AuthService } from './../../../../core/authentication/auth.service';
import { Component, OnInit } from '@angular/core';
import { Bassin } from '../../../../core/models/bassin.models';
import { Categorie } from '../../../../core/models/categorie.models';
import { BassinService } from '../../../../core/services/bassin.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { BassinBase } from '../../../../core/models/bassin-base.model';

@Component({
  selector: 'app-add-bassin',
  templateUrl: './add-bassin.component.html',
  styleUrls: ['./add-bassin.component.css'],
  // Ajoutez ces styles encapsulés
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      ::ng-deep .scroll-container {
        width: 100% !important;
      }

      ::ng-deep .content-wrapper {
        width: 100% !important;
        max-width: 100% !important;
      }
    `,
  ],
})
export class AddBassinComponent implements OnInit {
  newBassin: Bassin = new Bassin();

  categories: Categorie[] = [];
  newIdCategorie!: number;
  message: string = '';
  uploadedImage!: File;
  imagePath: any;
  dimensionsOptions: { label: string; value: string }[] = [
    { label: '2m x 1.5m x 1m (≈ 3 000L)', value: '200x150x100 cm' },
    { label: '2.5m x 1.5m x 1m (≈ 3 750L)', value: '250x150x100 cm' },
    { label: '3m x 2m x 1m (≈ 6 000L)', value: '300x200x100 cm' },
    { label: '3m x 2m x 1.5m (≈ 9 000L)', value: '300x200x150 cm' },
    { label: '3.5m x 2.5m x 1.5m (≈ 13 125L)', value: '350x250x150 cm' },
    { label: '4m x 2.5m x 1.5m (≈ 15 000L)', value: '400x250x150 cm' },
    { label: '4m x 2.5m x 2m (≈ 20 000L)', value: '400x250x200 cm' },
    { label: '5m x 3m x 2m (≈ 30 000L)', value: '500x300x200 cm' },
    { label: '6m x 3.5m x 2.5m (≈ 52 500L)', value: '600x350x250 cm' },
    { label: '7m x 4m x 2.5m (≈ 70 000L)', value: '700x400x250 cm' },
    { label: '8m x 5m x 3m (≈ 120 000L)', value: '800x500x300 cm' },
  ];
  couleurs: string[] = [
    'Bleu clair',
    'Bleu foncé',
    'Blanc',
    'Gris clair',
    'Gris foncé',
    'Beige',
    'Sable',
    'Vert',
    'Rouge',
    'Noir',
    'Marron',
  ];

  //uploadedImages: File[] = [];
  //imagePaths: string[] = [];
  uploadedImages: { [key: string]: File[] } = {
    bassin: [],
    detail: [],
    emplacement: [],
    imgmateriaux: [],
  };

  imagePaths: { [key: string]: string[] } = {
    bassin: [],
    detail: [],
    emplacement: [],
    imgmateriaux: [],
  };

  // Ajoutez cette propriété pour stocker les compteurs d'images
  imageCounters: { [key: string]: number } = {};

  selectedFiles: File[] = []; // Stocke les fichiers sélectionnés

  isValidGithubUrl: boolean = true; // Par défaut, l'URL est valide

  constructor(
    private bassinService: BassinService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  onCategoryChange(event: any): void {
    this.newIdCategorie = +event.target.value;
  }

  loadCategories(): void {
    this.bassinService.listeCategories().subscribe(
      (data) => {
        console.log('Catégories chargées:', data);
        this.categories = data;
      },
      (error) => {
        console.error('Erreur lors du chargement des catégories', error);
        this.message = 'Erreur lors du chargement des catégories';
      }
    );
  }

  updateDisponibilite(): void {
    this.newBassin.disponible =
      this.newBassin.stock !== undefined && this.newBassin.stock > 0;
  }

  onStockChange(): void {
    this.updateDisponibilite();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/signin']);
  }

  files: File[] = [];
  imagePreviews: string[] = [
    'assets/img/imagebassin/image1.webp',
    'assets/img/imagebassin/image2.webp',
    'assets/img/imagebassin/image3.jpg',
    'assets/img/imagebassin/image4.png',
  ];

  onFileSelected(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      this.files[index] = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviews[index] = e.target.result;
      };
      reader.readAsDataURL(file);

      console.log(`✅ Image ${index + 1} sélectionnée:`, file.name);
    }
  }

  triggerFileInput(index: number) {
    const fileInputs =
      document.querySelectorAll<HTMLInputElement>('input[type=file]');
    fileInputs[index]?.click();
  }

  addBassin() {
    // Validation de base du formulaire
    if (!this.newIdCategorie) {
      Swal.fire('Erreur', 'Veuillez sélectionner une catégorie.', 'error');
      return;
    }

    if (!this.newBassin.nomBassin || this.newBassin.nomBassin.trim() === '') {
      Swal.fire('Erreur', 'Le nom du bassin est obligatoire.', 'error');
      return;
    }

    if (!this.newBassin.prix || this.newBassin.prix <= 0) {
      Swal.fire('Erreur', 'Le prix doit être supérieur à 0.', 'error');
      return;
    }

    // Vérification des dimensions si nécessaire
    if (!this.newBassin.dimensions) {
      Swal.fire('Erreur', 'Veuillez sélectionner des dimensions.', 'error');
      return;
    }

    // Vérification si le bassin existe déjà avant soumission
    this.bassinService.existsByNomBassin(this.newBassin.nomBassin).subscribe({
      next: (exists: boolean) => {
        if (exists) {
          Swal.fire('Erreur', 'Un bassin avec ce nom existe déjà', 'error');
        } else {
          this.proceedWithBassinCreation();
        }
      },
      error: (error) => {
        console.error('Erreur lors de la vérification du nom', error);
        let errorMessage = 'Erreur lors de la vérification du nom du bassin';

        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        Swal.fire('Erreur', errorMessage, 'error');
      },
    });
  }

  private proceedWithBassinCreation(): void {
    // Association de la catégorie
    this.newBassin.categorie = this.categories.find(
      (c) => c.idCategorie === this.newIdCategorie
    )!;

    // Valeurs par défaut
    this.newBassin.archive = false;
    this.newBassin.quantity = 0;
    this.newBassin.dateAjout = new Date();
    this.newBassin.dateDerniereModification = new Date();
    this.newBassin.promotionActive = false;

    // Préparation du FormData
    const formData = new FormData();

    // Ajout des propriétés du bassin
    formData.append(
      'bassin',
      JSON.stringify({
        idBassin: this.newBassin.idBassin,
        nomBassin: this.newBassin.nomBassin,
        description: this.newBassin.description,
        prix: this.newBassin.prix,
        materiau: this.newBassin.materiau,
        couleur: this.newBassin.couleur,
        dimensions: this.newBassin.dimensions,
        disponible: this.newBassin.disponible,
        stock: this.newBassin.stock,
        categorie: {
          idCategorie: this.newBassin.categorie.idCategorie,
          nomCategorie: this.newBassin.categorie.nomCategorie,
          description: this.newBassin.categorie.description,
        },
        image3DPath: this.newBassin.image3DPath,
        archive: this.newBassin.archive,
        quantity: this.newBassin.quantity,
        dateAjout: this.newBassin.dateAjout,
        dateDerniereModification: this.newBassin.dateDerniereModification,
        promotionActive: this.newBassin.promotionActive,
      })
    );

    // Ajout des images
    this.files
      .filter((file) => file instanceof File)
      .forEach((file, index) => {
        formData.append(
          'images',
          file,
          `image_${index}.${file.name.split('.').pop()}`
        );
      });

    // Afficher un loader pendant l'envoi
    Swal.fire({
      title: 'Envoi en cours',
      html: "Veuillez patienter pendant l'ajout du bassin...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    // Envoi des données
    this.bassinService.ajouterBassinWithImg(formData).subscribe({
      next: (response: any) => {
        Swal.fire({
          title: 'Succès',
          text: 'Bassin ajouté avec succès',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          this.router.navigate(['/admin/details-bassin', response.idBassin]);
        });
      },
      error: (error: any) => {
        console.error("Erreur lors de l'ajout du bassin", error);
        let errorMessage = "Une erreur est survenue lors de l'ajout du bassin";

        // Gestion spécifique des erreurs de duplication
        if (
          error.status === 409 ||
          (error.error &&
            error.error.message &&
            error.error.message.includes('existe déjà'))
        ) {
          errorMessage = 'Un bassin avec ce nom existe déjà';
        }
        // Gestion des erreurs de validation du formulaire
        else if (error.error && error.error.errors) {
          const validationErrors = error.error.errors;
          errorMessage = 'Erreurs de validation :<ul>';
          for (const field in validationErrors) {
            errorMessage += `<li>${validationErrors[field].join(', ')}</li>`;
          }
          errorMessage += '</ul>';
        }
        // Autres erreurs avec message spécifique
        else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        Swal.fire({
          title: 'Erreur',
          html: errorMessage,
          icon: 'error',
        });
      },
      complete: () => {
        // Nettoyage éventuel
      },
    });
  }

  trackByIndex(index: number) {
    return index;
  }

  checkGithubUrl() {
    const githubPattern =
      /^https:\/\/github\.com\/.+\/.+\/blob\/.+\.(glb|gltf)$/;
    this.isValidGithubUrl = githubPattern.test(this.newBassin.image3DPath);
  }
}
