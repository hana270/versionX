import { forwardRef, Inject, Injectable, Injector } from '@angular/core';
import { Bassin } from '../models/bassin.models';
import { Categorie } from '../models/categorie.models';
import { ImageBassin } from '../models/image.models';
import { catchError, map, Observable, of, switchMap, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../authentication/auth.service';
import { BassinPersonnalise } from '../models/bassinpersonnalise.models';
import { Accessoire } from '../models/accessoire.models';
import { Promotion } from '../models/promotion.model';
import { ConfigServiceService } from './config-service.service';
import { Transaction } from '../models/transaction.models';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class BassinService {
  private apiURL: string;

  
  constructor(
    private http: HttpClient,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,     private injector: Injector,
    private configService: ConfigServiceService
  ) {
    
    this.apiURL = this.configService.aquatresorApiUrl;
  }

  someMethod() {
    this.authService = this.injector.get(AuthService);
    // use authService
  }
  getApiUrl(): string {
    return this.apiURL;
  }

  private getAuthService(): AuthService {
    if (!this.authService) {
      this.authService = this.injector.get(AuthService);
    }
    return this.authService;
  }


  // Méthodes pour les bassins standard
   // consulter un bassin
   consulterBassin(id: number): Observable<Bassin> {
    const url = `${this.apiURL}/getbyid/${id}`;
    let jwt = this.getAuthService().getToken();
    jwt = "Bearer " + jwt;
    let httpHeaders = new HttpHeaders({ "Authorization": jwt });
    return this.http.get<Bassin>(url, { headers: httpHeaders }).pipe(
      map(bassin => {
        // Si le bassin a une promotion, vérifier si elle est active
        if (bassin.promotion) {
          const now = new Date();
          const startDate = new Date(bassin.promotion.dateDebut);
          const endDate = new Date(bassin.promotion.dateFin);
          
          bassin.promotionActive = now >= startDate && now <= endDate;
          if (bassin.promotionActive) {
            bassin.prixPromo = bassin.prix * (1 - (bassin.promotion.tauxReduction / 100));
          }
        }
        return bassin;
      })
    );
  }

  ajouterBassin(bassin: Bassin): Observable<Bassin> {
    const headers = this.getHeaders();
    return this.http.post<Bassin>(`${this.apiURL}/addbassin`, bassin, { headers });
  }

  ajouterBassinWithImg(bassinData: FormData): Observable<any> {
    return this.http.post(`${this.apiURL}/addBassinWithImages`, bassinData, {
      headers: new HttpHeaders({
        'Accept': 'application/json'
      })
    });
  }

  // Nom bassin unique
existsByNomBassin(nomBassin: string): Observable<boolean> {
  const headers = this.getHeaders();
  return this.http.get<boolean>(`${this.apiURL}/existsByNomBassin?nomBassin=${encodeURIComponent(nomBassin)}`, { headers });
}

getAllBassins(): Observable<Bassin[]> {
  const headers = new HttpHeaders({
    Authorization: `Bearer ${this.getAuthService().getToken()}`,
  });
  return this.http.get<Bassin[]>(`${this.apiURL}/all`, { headers: headers });
}

  // supprimer bassin
  supprimerBassin(id: number): Observable<void> {
    const url = `${this.apiURL}/deletebassin/${id}`;
    let jwt = this.getAuthService().getToken();
    jwt = "Bearer " + jwt;
    let httpHeaders = new HttpHeaders({ "Authorization": jwt });
    return this.http.delete<void>(url, { headers: httpHeaders });
  }

  updateBassin(b: Bassin): Observable<Bassin> {
    const url = `${this.apiURL}/updatebassin/${b.idBassin}`;
    const headers = this.getHeaders();
    return this.http.put<Bassin>(url, b, { headers });
  }

  updateBassinWithImg(bassin: Bassin, files: File[]): Observable<Bassin> {
    const formData = new FormData();
    formData.append('bassin', JSON.stringify(bassin));
    files.forEach((file, index) => {
      if (file) {
        formData.append(`files`, file);
      }
    });
    return this.http.post<Bassin>(`${this.apiURL}/updateBassinWithImg`, formData);
  }

  // Méthodes pour les images
  uploadImage(file: File, filename: string): Observable<ImageBassin> {
    const imageFormData = new FormData();
    imageFormData.append('image', file, filename);
    return this.http.post<ImageBassin>(`${this.apiURL}/image/upload`, imageFormData);
  }

  loadImage(id: number): Observable<ImageBassin> {
    return this.http.get<ImageBassin>(`${this.apiURL}/image/get/info/${id}`);
  }

  uploadImageBassin(file: File, filename: string, idBassin: number): Observable<any> {
    const imageFormData = new FormData();
    imageFormData.append('image', file, filename);
    return this.http.post(`${this.apiURL}/image/uploadImageB/${idBassin}`, imageFormData);
  }

  uploadImageFS(file: File, idBassin: number): Observable<any> {
    const imageFormData = new FormData();
    imageFormData.append('image', file);
    return this.http.post(`${this.apiURL}/imagesBassin/uploadFS/${idBassin}`, imageFormData);
  }

  supprimerImage(id: number): Observable<void> {
    const url = `${this.apiURL}/imagesBassin/delete/${id}`;
    let jwt = this.getAuthService().getToken();
    jwt = "Bearer " + jwt;
    let httpHeaders = new HttpHeaders({ "Authorization": jwt });
    return this.http.delete<void>(url, { headers: httpHeaders });
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return 'assets/images/no-image.png';
    
    // Extraire juste le nom du fichier depuis le chemin complet
    const fileName = imagePath.split('/').pop() || imagePath.split('\\').pop() || '';
    
    // Utilisez le bon endpoint pour les images d'accessoires
    return `${this.apiURL}/bassinpersonnalise/imagesaccessoiresbassin/${fileName}`;
}

supprimerImageAccessoire(imagePath: string): Observable<any> {
  const fileName = this.getFileNameFromPath(imagePath);
  return this.http.delete(`${this.apiURL}/imagesaccessoiresbassin/${fileName}`);
}

getFileNameFromPathbassinpersonnalise(path: string | null): string {
    if (!path) return '';
    // Handle both Windows and Unix paths
    return path.split(/[\\/]/).pop() || '';
  }

getPersonnaliseImageUrl(path: string): string {
  return `${this.apiURL}/imagespersonnalise/${this.getFileNameFromPath(path)}`;
}

getAccessoireImageUrl(path: string): string {
  if (!path) return 'assets/default-image.webp';
  
  // Extract just the filename from the full path
  const fileName = this.getFileNameFromPath(path);
  
  return `${this.apiURL}/imagesaccessoiresbassin/${fileName}`;
}

  // Méthodes pour les catégories
  listeCategories(): Observable<Categorie[]> {
    const headers = this.getHeaders();
    return this.http.get<Categorie[]>(`${this.apiURL}/categories`, { headers });
  }

  getAllCategories(): Observable<any[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.getAuthService().getToken()}`,
    });
    return this.http.get<any[]>(`${this.apiURL}/categories`, { headers: headers });
  }

  // Méthodes pour les bassins personnalisés
  ajouterBassinPersonnalise(formData: FormData, idBassin: number): Observable<BassinPersonnalise> {
    const headers = this.getHeaders();
    return this.http.post<BassinPersonnalise>(
      `${this.apiURL}/bassinpersonnalise/ajouterBassinPersonnalise/${idBassin}`,
      formData
    );
  }

  consulterBassinPersonnalise(id: number): Observable<BassinPersonnalise> {
    return this.http.get<BassinPersonnalise>(`${this.apiURL}/bassinpersonnalise/detailBassinPersonnalise/${id}`)
      .pipe(
        map(bassinPersonnalise => {
          bassinPersonnalise.accessoires = bassinPersonnalise.accessoires.map(accessoire => {
            const fileName = this.getFileNameFromPath(accessoire.imagePath);
            accessoire.imageUrl = `${this.apiURL}/imagespersonnalise/${fileName}`;
            return accessoire;
          });
          return bassinPersonnalise;
        })
      );
  }

  supprimerBassinPersonnalise(idBassinPersonnalise: number): Observable<BassinPersonnalise> {
    const headers = this.getHeaders();
    return this.http.delete<BassinPersonnalise>(
      `${this.apiURL}/bassinpersonnalise/supprimerBassinPersonnalise/${idBassinPersonnalise}`,
      { headers }
    );
  }

  getBassinPersonnaliseByBassinId(idBassin: number): Observable<any> {
    return this.http.get<any>(`${this.apiURL}/bassinpersonnalise/getBassinPersonnaliseByBassin/${idBassin}`);
  }

  mettreAJourBassinPersonnalise(idBassinPersonnalise: number, formData: FormData): Observable<BassinPersonnalise> {
    return this.http.put<BassinPersonnalise>(
      `${this.apiURL}/bassinpersonnalise/mettreAJourBassinPersonnalise/${idBassinPersonnalise}`,
      formData
    );
  }

  getAccessoireImages(idBassinPersonnalise: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiURL}/bassinpersonnalise/${idBassinPersonnalise}/accessoires/images`);
  }

  getBassinPersonnaliseOptions(idBassin: number): Observable<{
    materiaux: string[],
    dimensions: string[],
    accessoires: any[]
  }> {
    const url = `${this.apiURL}/bassinpersonnalise/options/${idBassin}`;
    const headers = this.getHeaders();
    
    return this.http.get<{
      materiaux: string[],
      dimensions: string[],
      accessoires: any[]
    }>(url, { headers }).pipe(
      map(options => {
        options.accessoires = options.accessoires.map(accessoire => {
          const fileName = this.getFileNameFromPath(accessoire.imagePath);
          accessoire.imageUrl = `${this.apiURL}/imagespersonnalise/${fileName}`;
          return accessoire;
        });
        return options;
      }),
      catchError(error => {
        console.error('Error loading customization options', error);
        return of({
          materiaux: [],
          dimensions: [],
          accessoires: []
        });
      })
    );
  }
/********** PROMOTIONS  ******** */
  getBassinsWithPromotions(): Observable<Bassin[]> {
    return this.http.get<Bassin[]>(`${this.apiURL}/bassins?includePromotions=true`).pipe(
      map(bassins => {
        return bassins.map(bassin => {
          // Si le bassin a une promotion active, calculer le prix promo
          if (bassin.promotion && this.estPromotionActive(bassin.promotion)) {
            bassin.promotionActive = true;
            bassin.prixPromo = this.calculerPrixAvecPromotion(bassin);
          } else {
            bassin.promotionActive = false;
            bassin.prixPromo = bassin.prix; // Pas de promotion, le prix promo est le prix normal
          }
          return bassin;
        });
      })
    );
  }

  calculerPrixAvecPromotion(bassin: Bassin): number {
    if (bassin.promotion && bassin.promotionActive) {
      return bassin.prix * (1 - bassin.promotion.tauxReduction);
    }
    return bassin.prix;
  }

  // Vérifier si une promotion est active
  estPromotionActive(promotion: Promotion | undefined): boolean {
    if (!promotion) return false;

    // Si le statut est déjà défini, on l'utilise
    if (promotion.status === 'ACTIVE') return true;

    // Sinon on vérifie les dates
    const maintenant = new Date();
    const debut = new Date(promotion.dateDebut);
    const fin = new Date(promotion.dateFin);

    return maintenant >= debut && maintenant <= fin;
  }

  // Méthodes pour les notifications
  getNotifications(): Observable<any[]> {
    const headers = this.getHeaders();
    return this.http.get<any[]>(`${this.apiURL}/notifications`, { headers });
  }

  // Méthodes pour la gestion du stock
  mettreAJourQuantite(id: number, quantite: number, raison: string): Observable<any> {
    return this.http.post(`${this.apiURL}/${id}/mettre-a-jour-quantite`, null, {
      params: {
        quantite: quantite.toString(),
        raison: raison
      }
    }).pipe(
      catchError(error => {
        if (error.error instanceof ErrorEvent) {
          // Erreur côté client
          return throwError('Une erreur est survenue lors de la mise à jour du stock');
        } else {
          // Erreur côté serveur
          return throwError(error.error.message || 'Erreur lors de la mise à jour du stock');
        }
      })
    );
  }

  // Méthodes pour l'archivage
syncBassinStatus(bassin: Bassin): Bassin {
  // Synchronisation statut/stock
  if (bassin.stock === 0) {
    bassin.statut = 'SUR_COMMANDE';
    bassin.disponible = false; // Marquer comme indisponible si stock = 0
  } else {
    bassin.statut = 'DISPONIBLE';
    bassin.disponible = true;
  }
  return bassin;
}
getAvailabilityStatus(bassin: Bassin): string {
  if (bassin.statut === 'SUR_COMMANDE') {
    return 'Sur Commande';
  } else if (bassin.statut === 'DISPONIBLE') {
    return 'Disponible';
  } else {
    return 'Indisponible';
  }
}

listeBassin(): Observable<Bassin[]> {
  const headers = this.getHeaders();
  return this.http.get<Bassin[]>(this.apiURL + "/all", { headers }).pipe(
    map(bassins => bassins.map(bassin => this.syncBassinStatus(bassin)))
  );
  }

  getBassinsNonArchives(): Observable<Bassin[]> {
    return this.http.get<Bassin[]>(`${this.apiURL}/non-archives`).pipe(
      map(bassins => bassins.map(bassin => this.syncBassinStatus(bassin)))
    );
    }

    getBassinsArchives(): Observable<Bassin[]> {
      return this.http.get<Bassin[]>(`${this.apiURL}/archives`).pipe(
        map(bassins => bassins.map(bassin => this.syncBassinStatus(bassin)))
      );
      }


      archiverBassin(id: number): Observable<Bassin> {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${this.getAuthService().getToken()}`
        });
        
        return this.http.get<Bassin>(`${this.apiURL}/getbyid/${id}`, { headers }).pipe(
          switchMap(bassin => {
            // Vérifier si le stock est à 0
            if (bassin.stock !== 0) {
              return throwError(() => new Error('Le stock doit être à 0 pour archiver un bassin'));
            }
            // Procéder à l'archivage si le stock est à 0
            return this.http.post<Bassin>(`${this.apiURL}/${id}/archiver`, {}, { headers });
          })
        );
      }

 // méthode pour mettre à jour le statut d'un bassin
updateBassinStatus(id: number, newStatus: string): Observable<Bassin> {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.getAuthService().getToken()}`
  });
  
  return this.http.post<Bassin>(
    `${this.apiURL}/${id}/update-status`, 
    { statut: newStatus }, 
    { headers }
  );
}

canArchiveBassin(bassin: Bassin): boolean {
  return bassin.stock === 0;
}

desarchiverBassin(id: number, nouvelleQuantite: number): Observable<Bassin> {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.getAuthService().getToken()}`
  });
  
  let params = new HttpParams()
    .set('nouvelleQuantite', nouvelleQuantite.toString());
  
  return this.http.post<Bassin>(
    `${this.apiURL}/${id}/desarchiver`, 
    null, 
    { headers: headers, params: params }
  );
}

  // Méthodes pour les rapports
  generateStockReport(): Observable<Blob> {
    return this.http.get(`${this.apiURL}/export-rapport`, {
      responseType: 'blob'
    });
  }
generateStockReportt(startDate: Date, endDate: Date): Observable<Blob> {
    // Convertir les dates en format ISO string
    const params = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
    
    return this.http.get(`${this.apiURL}/export-rapport`, {
      responseType: 'blob',
      params: params
    });
}

  // Méthodes utilitaires
  // Méthode pour générer les en-têtes avec le token JWT
  private getHeaders(): HttpHeaders {
    const token = this.getAuthService().getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

   // Charger les images pour un bassin spécifique
   chargerImagesPourBassin(bassin: Bassin): Bassin {
    if (bassin.imagesBassin && bassin.imagesBassin.length > 0) {
      // Utilisez directement l'URL de l'image si elle est déjà complète
      if (bassin.imagesBassin[0].imagePath.startsWith('http')) {
        bassin.imageStr = bassin.imagesBassin[0].imagePath;
      } else {
        bassin.imageStr = `${this.apiURL}/imagesBassin/getFS/${bassin.imagesBassin[0].imagePath}`;
      }
    } else {
      bassin.imageStr = 'assets/default-image.webp';
    }
    return bassin;
  }

  private getFileNameFromPath(filePath: string): string {
    const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || filePath;
    return fileName;
  }

  getBaseImageUrl(): string {
    return `${this.apiURL}/imagespersonnalise`;
  }

// Liste des bassins avec gestion des promotions
listeBassinClient(): Observable<Bassin[]> {
  const headers = new HttpHeaders({
    Authorization: `Bearer ${this.getAuthService().getToken()}`,
  });
  return this.http.get<Bassin[]>(`${this.apiURL}/all`, { headers: headers }).pipe(
    map(bassins => {
      return bassins.map(bassin => {
        // Vérifier si la promotion est active
        if (bassin.promotion) {
          bassin.promotionActive = this.estPromotionActive(bassin.promotion);
          if (bassin.promotionActive) {
            bassin.prixPromo = this.calculerPrixAvecPromotion(bassin);
          }
        }
        return this.chargerImagesPourBassin(bassin);
      });
    })
  );
}

// Liste des bassins avec leurs promotions actives
listeBassinsAvecPromotions(): Observable<Bassin[]> {
  return this.http.get<any[]>(`${this.apiURL}/promotions/bassins?includePromotions=true`, {
    headers: {
      Authorization: `Bearer ${this.getAuthService().getToken()}`,
    }
  }).pipe(
    map(data => {
      const now = new Date(); // Ajout de la date actuelle pour vérification
      
      return data.map(item => {
        const bassin = new Bassin();
        bassin.idBassin = item.idBassin;
        bassin.nomBassin = item.nomBassin;
        bassin.description = item.description;
        bassin.prix = item.prix;
        bassin.materiau = item.materiau;
        bassin.couleur = item.couleur;
        bassin.dimensions = item.dimensions;
        bassin.disponible = item.disponible;
        bassin.stock = item.stock;
        bassin.archive = item.archive;
        bassin.categorie = item.categorie;
        bassin.imagesBassin = item.imagesBassin;
        
        // Gérer les promotions
        if (item.activePromotion) {
          bassin.promotion = new Promotion({
            idPromotion: item.activePromotion.idPromotion,
            nomPromotion: item.activePromotion.nomPromotion,
            tauxReduction: item.activePromotion.tauxReduction,
            dateDebut: item.activePromotion.dateDebut,
            dateFin: item.activePromotion.dateFin,
            status: 'ACTIVE'
          });

          // Vérifier si la promotion est active en fonction des dates
          const startDate = new Date(item.activePromotion.dateDebut);
          const endDate = new Date(item.activePromotion.dateFin);
          bassin.promotionActive = now >= startDate && now <= endDate;

          // Calculer le prix promo si la promotion est active
          if (bassin.promotionActive) {
            bassin.prixPromo = bassin.prix * (1 - (item.activePromotion.tauxReduction / 100));
          }
        } else {
          bassin.promotionActive = false;
        }
        
        return this.chargerImagesPourBassin(bassin);
      });
    })
  );
}

  // Méthodes pour les commandes
  mettreSurCommande(id: number, dureeJours: number): Observable<Bassin> {
    const headers = new HttpHeaders({
        'Authorization': `Bearer ${this.getAuthService().getToken()}`
    });
    
    return this.http.post<Bassin>(
        `${this.apiURL}/${id}/mettre-sur-commande`, 
        null,
        { 
            headers: headers,
            params: new HttpParams().set('dureeFabricationJours', dureeJours.toString())
        }
    );
  }

  updateDureeFabrication(id: number, duree: number): Observable<Bassin>;
  updateDureeFabrication(id: number, dureeMin: number, dureeMax: number): Observable<Bassin>;
  updateDureeFabrication(id: number, dureeOrMin: number, dureeMax?: number): Observable<Bassin> {
      let params = new HttpParams();
      
      if (dureeMax !== undefined) {
          params = params.set('dureeMin', dureeOrMin.toString())
                         .set('dureeMax', dureeMax.toString());
      } else {
          params = params.set('duree', dureeOrMin.toString());
      }
      
      return this.http.put<Bassin>(`${this.apiURL}/${id}/duree-fabrication`, null, { params });
  }
  getBassinDetails(id: number): Observable<Bassin> {
    return this.http.get<Bassin>(`${this.apiURL}/getbyid/${id}`).pipe(
      map(bassin => {
        // Charger l'image principale
        if (bassin.imagesBassin && bassin.imagesBassin.length > 0) {
          bassin.imagePath = `${this.apiURL}/imagesBassin/getFS/${bassin.imagesBassin[0].imagePath}`;
        }
        return bassin;
      }),
      catchError(error => {
        console.error('Error fetching bassin details', error);
        return throwError(() => new Error('Could not load bassin details'));
      })
    );
  }
  /*** Partie commande*****/
updateStock(bassinId: number, quantite: number): Observable<Bassin> {
  return this.http.put<Bassin>(`${this.apiURL}/bassins/${bassinId}/stock`, null, {
    params: { quantite: quantite.toString() }
  });
}
getBassinTransactions(bassinId: number): Observable<Transaction[]> {
  return this.http.get<Transaction[]>(`${this.apiURL}/transactions/${bassinId}`);
}

getBassinStatus(bassinId: number): Observable<'DISPONIBLE' | 'SUR_COMMANDE' | 'RUPTURE_STOCK'> {
    return this.getBassinDetails(bassinId).pipe(
        map(bassin => {
            if (bassin.surCommande) {
                return 'SUR_COMMANDE';
            }
            return bassin.stock > 0 ? 'DISPONIBLE' : 'RUPTURE_STOCK';
        }),
        catchError(() => of('RUPTURE_STOCK' as const)) // Use 'as const' to maintain the literal type
    );
}
}