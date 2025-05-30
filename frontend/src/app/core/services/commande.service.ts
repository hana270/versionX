import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout, retry, tap } from 'rxjs/operators';
import { AuthStateService } from './auth-state.service';
import {
  Commande,
  CreationCommandeRequest,
  PaiementRequest,
  CommandeResponse,
  StatutCommande,
  ModePaiement,
  LigneCommande,
  AccessoireCommande,
} from '../models/commande.models';
import { ConfigServiceService } from './config-service.service';
import { AuthService } from '../authentication/auth.service';

@Injectable({
  providedIn: 'root',
})
export class CommandeService {
  private apiUrl: string;
  private panierUrl: string;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private authStateService: AuthStateService,
    private configService: ConfigServiceService
  ) {
    this.apiUrl = `${this.configService.apiUrl}/api/panier/commandes`;
    this.panierUrl = `${this.configService.apiUrl}/api/panier`;
  }

  private getHeaders(): HttpHeaders {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    const token = this.authStateService.getToken();
    if (token) {
      return headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  checkBackendStatus(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/health`, {
        headers: this.getHeaders(),
        responseType: 'text',
      })
      .pipe(timeout(5000), catchError(this.handleError));
  }

  checkCommandeAccess(commandeId: string): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/${commandeId}/can-access`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response: any) => {
          if (!response.canAccess) {
            throw new Error('Accès non autorisé à la commande');
          }
          return response;
        }),
        catchError((error) => {
          console.error('Erreur vérification accès commande:', error);
          return throwError(() => ({
            userMessage: 'Vous n’êtes pas autorisé à accéder à cette commande',
            technicalMessage: error.message || 'Unauthorized access',
            errorCode: 'UNAUTHORIZED',
            status: error.status || 403,
            originalError: error,
          }));
        })
      );
  }

creerCommande(request: CreationCommandeRequest): Observable<CommandeResponse> {
  // Enhanced validation
  if (!request.clientId) {
    return throwError(() => new Error('ID du client requis'));
  }
  if (!request.items || request.items.length === 0) {
    return throwError(() => new Error('La commande doit contenir au moins un article'));
  }
  if (!request.clientNom || !request.clientPrenom || !request.clientEmail || !request.clientTelephone) {
    return throwError(() => new Error('Les informations du client sont incomplètes'));
  }
  if (!request.adresseLivraison || !request.codePostal || !request.ville || !request.region) {
    return throwError(() => new Error('Les informations de livraison sont incomplètes'));
  }

  return this.http.post<CommandeResponse>(this.apiUrl, request, {
    headers: this.getHeaders()
  }).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Erreur lors de la création de la commande';
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Données de commande invalides';
          break;
        case 401:
          errorMessage = 'Authentification requise';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        case 0:
          errorMessage = 'Impossible de contacter le serveur';
          break;
      }
      return throwError(() => new Error(errorMessage));
    })
  );
}

 
  private validateRequest(request: Partial<CreationCommandeRequest>): void {
    if (!request.clientId || isNaN(request.clientId) || request.clientId <= 0) {
      throw new Error('Client ID is required and must be a positive number');
    }
    if (!request.items || request.items.length === 0) {
      throw new Error('At least one item is required');
    }
    if (!request.adresseLivraison?.trim()) {
      throw new Error('Delivery address is required');
    }
    if (!request.codePostal || !/^\d{4}$/.test(request.codePostal)) {
      throw new Error('Code postal must be exactly 4 digits');
    }
    if (!request.ville?.trim()) {
      throw new Error('City is required');
    }
    if (!request.region?.trim()) {
      throw new Error('Region is required');
    }
    if (!request.clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.clientEmail)) {
      throw new Error('Invalid client email');
    }
    if (!request.clientTelephone || !/^\d{8}$/.test(request.clientTelephone)) {
      throw new Error('Client phone number must be exactly 8 digits');
    }
    if (!request.clientNom?.trim()) {
      throw new Error('Client last name is required');
    }
    if (!request.clientPrenom?.trim()) {
      throw new Error('Client first name is required');
    }

    request.commentaires = request.commentaires?.trim() || null;
    request.modeLivraison = request.modeLivraison?.trim() || 'STANDARD';

    request.items.forEach((item, index) => {
      if (!item) {
        throw new Error(`Item at index ${index} is undefined`);
      }
      if (!item.bassinId) {
        throw new Error(`Item at index ${index} is missing bassinId`);
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Item at index ${index} has invalid quantity: ${item.quantity}`);
      }
      if (item.prixUnitaire == null || item.prixUnitaire < 0) {
        throw new Error(`Item at index ${index} has invalid prixUnitaire: ${item.prixUnitaire}`);
      }
      item.nomBassin = item.nomBassin?.trim() || 'Bassin sans nom';
      item.description = item.description?.trim() || null;
      item.imageUrl = item.imageUrl?.trim() || null;
      item.status = item.status || (item.isCustomized ? 'SUR_COMMANDE' : 'DISPONIBLE');
      item.prixTotal = item.prixUnitaire * item.quantity;
      item.materiauSelectionne = item.materiauSelectionne?.trim() || null;
      item.dimensionSelectionnee = item.dimensionSelectionnee?.trim() || null;
      item.couleurSelectionnee = item.couleurSelectionnee?.trim() || null;
      item.delaiFabrication = item.delaiFabrication?.trim() || (item.isCustomized ? '15 jours' : null);
      item.prixAccessoires = item.prixAccessoires ?? 0;
      item.accessoires = item.accessoires || [];
    });
  }



  private handleError(error: any): Observable<never> {
    console.error('Order service error:', error);
    let userMessage = 'An error occurred during operation';
    let technicalMessage = error.message || 'Unknown error';
    let errorCode = 'UNKNOWN_ERROR';
    let status = error.status || 0;

    if (error instanceof HttpErrorResponse) {
      status = error.status;
      if (error.status === 0) {
        userMessage = 'Network error: Could not connect to server';
        errorCode = 'NETWORK_ERROR';
      } else if (error.status === 400) {
        userMessage = error.error?.message || 'Invalid request data';
        errorCode = 'VALIDATION_ERROR';
      } else if (error.status === 404) {
        userMessage = error.error?.message || 'Resource not found';
        errorCode = 'NOT_FOUND';
      } else if (error.status === 500) {
        userMessage = 'Server error during processing';
        technicalMessage =
          typeof error.error === 'string'
            ? error.error
            : error.error?.message || error.message;
        errorCode = 'SERVER_ERROR';
      }
    } else if (error.name === 'TimeoutError') {
      userMessage = 'Request timeout. Please try again.';
      errorCode = 'TIMEOUT_ERROR';
    }

    return throwError(() => ({
      userMessage,
      technicalMessage,
      errorCode,
      status,
      originalError: error,
    }));
  }

  private mapToCommande(data: any): Commande {
    if (!data) {
      throw new Error('Invalid command data');
    }
    return {
      id: data.id ?? undefined,
      numeroCommande: data.numeroCommande ?? '',
      clientId: data.clientId ?? 0,
      emailClient: data.emailClient ?? '',
      statut: (data.statut as StatutCommande) ?? StatutCommande.EN_ATTENTE,
      montantTotal: data.montantTotal ?? 0,
      montantTVA: data.montantTVA ?? 0,
      montantTotalTTC: data.montantTotalTTC ?? 0,
      modePaiement: data.modePaiement ? (data.modePaiement as ModePaiement) : null,
      paiementConfirme: data.paiementConfirme ?? null,
      dateCreation: data.dateCreation ? new Date(data.dateCreation) : new Date(),
      datePaiement: data.datePaiement ? new Date(data.datePaiement) : null,
      adresseLivraison: data.adresseLivraison ?? '',
      codePostal: data.codePostal ?? '',
      ville: data.ville ?? '',
      pays: data.pays ?? '',
      clientNom: data.clientNom ?? '',
      clientPrenom: data.clientPrenom ?? '',
      clientEmail: data.clientEmail ?? '',
      clientTelephone: data.clientTelephone ?? '',
      commentaires: data.commentaires ?? null,
      lignesCommande: data.lignesCommande
        ? data.lignesCommande.map((ligne: any) => this.mapToLigneCommande(ligne))
        : [],
    };
  }

  private mapToLigneCommande(data: any): LigneCommande {
    return {
      id: data.id ?? undefined,
      produitId: data.produitId ?? 0,
      typeProduit: data.typeProduit ?? 'BASSIN_STANDARD',
      nomProduit: data.nomProduit ?? '',
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      quantite: data.quantite ?? 1,
      prixUnitaire: data.prixUnitaire ?? 0,
      prixTotal: data.prixTotal ?? 0,
      materiauSelectionne: data.materiauSelectionne ?? null,
      prixMateriau: data.prixMateriau ?? null,
      dimensionSelectionnee: data.dimensionSelectionnee ?? null,
      prixDimension: data.prixDimension ?? null,
      couleurSelectionnee: data.couleurSelectionnee ?? null,
      statutProduit: data.statutProduit ?? 'DISPONIBLE',
      delaiFabrication: data.delaiFabrication ?? null,
      accessoires: data.accessoires?.map((acc: any) => this.mapToAccessoireCommande(acc)) ?? [],
    };
  }

  private mapToAccessoireCommande(data: any): AccessoireCommande {
    return {
      accessoireId: data.accessoireId,
      nomAccessoire: data.nomAccessoire,
      prixAccessoire: data.prixAccessoire,
      imageUrl: data.imageUrl,
    };
  }

  getCommandesClient(clientId: number): Observable<Commande[]> {
    return this.http
      .get<Commande[]>(`${this.apiUrl}/client/${clientId}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response: any[]) => response.map(data => this.mapToCommande(data))),
        catchError((error) => {
          console.error('Erreur récupération commandes client:', error);
          return throwError(() => new Error('Erreur lors de la récupération des commandes'));
        })
      );
  }

  traiterPaiement(request: PaiementRequest): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/paiement`, request, {
        headers: this.getHeaders(),
      })
      .pipe(
        catchError((error) => {
          console.error('Erreur traitement paiement:', error);
          return throwError(() => new Error('Erreur lors du traitement du paiement'));
        })
      );
  }

 annulerCommande(numeroCommande: string): Observable<void> {
  return this.http
    .delete<void>(`${this.apiUrl}/${numeroCommande}/annuler`, {
      headers: this.getHeaders(),
    })
    .pipe(
      catchError((error) => {
        console.error('Erreur annulation commande:', error);
        return throwError(() => ({
          userMessage: "Erreur lors de l'annulation de la commande",
          technicalMessage: error.error?.message || error.message,
          errorCode: error.error?.errorCode || 'CANCEL_FAILED',
          status: error.status || 0,
          originalError: error,
        }));
      })
    );
}
  createPanier(panierData: any): Observable<any> {
    return this.http
      .post<any>(this.panierUrl, panierData, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  getCommande(identifier: string | number): Observable<Commande> {
    console.log(`Fetching order details for: ${identifier}`);
    const isNumericId = !isNaN(Number(identifier)) && identifier.toString().indexOf('-') === -1;
    const endpoint = isNumericId
      ? `${this.apiUrl}/by-id/${identifier}`
      : `${this.apiUrl}/${identifier}`;
    return this.http
      .get<Commande>(endpoint, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => {
          console.log('Order details retrieved successfully:', response);
          return this.mapToCommande(response);
        }),
        catchError((error: HttpErrorResponse) => {
          console.error('Order fetch error:', error);
          if (error.status === 404) {
            return throwError(() => ({
              userMessage: `La commande "${identifier}" n'a pas été trouvée`,
              technicalMessage: error.error?.message || 'Order not found',
              errorCode: 'ORDER_NOT_FOUND',
              status: 404,
              originalError: error,
            }));
          } else if (error.status === 0) {
            return throwError(() =>
              new Error('Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.')
            );
          } else {
            const errorMsg = error.error?.message || 'Erreur lors de la récupération des détails de la commande';
            return throwError(() => new Error(errorMsg));
          }
        })
      );
  }

  updateOrderStatus(commandeId: string): Observable<Commande> {
    const updateData = {
      paiementConfirme: true,
    };
    return this.http
      .put<Commande>(`${this.apiUrl}/${commandeId}/statut`, updateData, {
        headers: this.getHeaders(),
      })
      .pipe(
        tap((updatedOrder) => {
          console.log('Order status updated to VALIDEE:', updatedOrder);
        }),
        catchError((error) => {
          console.error('Failed to update order status:', error);
          return throwError(() =>
            new Error('Le paiement a été validé mais la mise à jour du statut de la commande a échoué.')
          );
        })
      );
  }

 getCommandesClientByStatus(clientId: number, statuses: string[]): Observable<Commande[]> {
    // Vérification des paramètres
    if (!clientId || !statuses || statuses.length === 0) {
      console.warn('Paramètres invalides pour getCommandesClientByStatus');
      return throwError(() => ({
        userMessage: 'Paramètres invalides pour la recherche de commandes',
        technicalMessage: 'Invalid parameters',
        errorCode: 'INVALID_PARAMETERS',
        status: 400
      }));
    }

    // Correction ici: utiliser 'statuses' comme nom de paramètre mais en format array
    let params = new HttpParams();
    // Au lieu d'appendre plusieurs fois 'statuses', on le fait une seule fois par statut
    statuses.forEach(status => {
      params = params.append('statuses', status);
    });
    
    console.log('Params envoyés:', params.toString()); // Log pour débogage
    
    return this.http
      .get<any[]>(`${this.apiUrl}/client/${clientId}/by-status`, {
        headers: this.getHeaders(),
        params: params
      })
      .pipe(
        map((response: any[]) => {
          console.log('Réponse du serveur:', response); // Log pour débogage
          if (!Array.isArray(response)) {
            console.warn('La réponse n\'est pas un tableau:', response);
            return [];
          }
          return response.map(data => this.mapToCommande(data));
        }),
        catchError((error) => {
          console.error('Erreur récupération commandes client par statut:', error);
          
          // Formater l'erreur pour une meilleure gestion côté client
          return throwError(() => ({
            userMessage: 'Erreur lors de la récupération des commandes',
            technicalMessage: error.message || 'Failed to fetch orders',
            errorCode: 'FETCH_FAILED',
            status: error.status || 0,
            originalError: error,
          }));
        })
      );
  }

/****** */

/**
 * Récupère toutes les commandes avec leurs détails pour l'admin
 */
getAllCommandes(): Observable<Commande[]> {
    // Verify admin access
    if (!this.authService.isAdmin()) {
        return throwError(() => ({
            userMessage: 'Accès refusé : droits insuffisants',
            technicalMessage: 'User is not admin',
            errorCode: 'UNAUTHORIZED',
            status: 403
        }));
    }

    const headers = this.getAuthHeaders();
    return this.http.get<any[]>(`${this.apiUrl}/admin/all`, { headers }).pipe(
        tap(commandes => console.log('Commandes reçues du backend:', commandes)),
        map(commandes => {
            if (!Array.isArray(commandes)) {
                console.warn('Réponse inattendue, non tableau:', commandes);
                return [];
            }
            return commandes.map(commande => {
                try {
                    return {
                        ...this.mapToCommande(commande),
                        lignesCommande: this.convertLignesCommande(commande.lignesCommande)
                    };
                } catch (e) {
                    console.error(`Erreur lors de la conversion de la commande ${commande.numeroCommande}:`, e);
                    return null;
                }
            }).filter((cmd): cmd is Commande => cmd !== null);
        }),
        catchError(error => {
            console.error('Erreur lors de la récupération des commandes:', error);
            return throwError(() => ({
                userMessage: 'Erreur lors de la récupération des commandes',
                technicalMessage: error.message || 'Failed to fetch orders',
                errorCode: error.error?.errorCode || 'FETCH_FAILED',
                status: error.status || 500,
                originalError: error
            }));
        })
    );
}

/**
 * Convertit les lignes de commande en tableau de LigneCommande
 */
private convertLignesCommande(lignes: unknown): LigneCommande[] {
    if (!lignes) {
        return [];
    }

    if (Array.isArray(lignes)) {
        return lignes
            .filter(item => item && typeof item === 'object' && 'produitId' in item)
            .map(item => {
                try {
                    return this.mapToLigneCommande(item);
                } catch (e) {
                    console.error('Erreur lors de la conversion d’une ligne de commande:', e);
                    return null;
                }
            })
            .filter((ligne): ligne is LigneCommande => ligne !== null);
    }

    return [];
}
  /**
   * Met à jour le statut d'une commande
   */
  updateCommandeStatus(commandeId: number, newStatus: StatutCommande): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.post<void>(
      `${this.apiUrl}/commande/${commandeId}/statut?statut=${newStatus}`, 
      {}, 
      { headers }
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la mise à jour du statut:', error);
        return throwError(() => new Error(`Erreur lors de la mise à jour du statut: ${error.message}`));
      })
    );
  }

  /**
   * Convertit les dates string en objets Date pour l'affichage
   */
  private processCommandesDates(commandes: Commande[]): Commande[] {
    return commandes.map(commande => ({
      ...commande,
      dateCreation: commande.dateCreation ? new Date(commande.dateCreation) : null,
      datePaiement: commande.datePaiement ? new Date(commande.datePaiement) : undefined
    }));
  }

  /**
   * Obtient les en-têtes d'authentification
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }
}