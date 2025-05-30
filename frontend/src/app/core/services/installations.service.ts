import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigServiceService } from './config-service.service';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators'; // Add this import
import { AuthService } from '../authentication/auth.service';
import { Installateur } from '../models/installateur.model';
import { AffectationDTO, AffectationResponseDTO } from '../models/affectation-response.dto';
import { CommandeResponse } from '../models/commande.models';

@Injectable({
  providedIn: 'root'
})
export class InstallationsService {
  private apiUrl: string;
  private apiUrlp = 'http://localhost:8087/api/installations';

  constructor(private http: HttpClient,
              private authService: AuthService,
              private configService: ConfigServiceService) 
  {
    this.apiUrl = this.configService.installationsApiUrl;
   }

   // Pour les affectations
  createAffectation(commandeId: number, affectationData: any): Observable<any> {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.authService.getToken()}`,
    'Content-Type': 'application/json'
  });

  return this.http.post(
    `${this.apiUrl}/affectations/affecterinstallation/${commandeId}`,
    affectationData,
    { headers }
  ).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Erreur lors de l\'affectation';
      if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.error && error.error.message) {
        errorMessage = error.error.message;
      }
      return throwError(() => new Error(errorMessage));
    })
  );
}

   /* createAffectation(commandeId: number, affectationData: any): Observable<any> {
      return this.http.post(
        `${this.apiUrlp}/affectations/affecterinstallation/${commandeId}`, 
        affectationData
      );
    }*/

  getAffectations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/affectations`);
  }

  // Pour les installateurs
  getInstallateurs(): Observable<Installateur[]> {
    return this.http.get<Installateur[]>(`${this.apiUrl}/installateurs`, {
      headers: this.getAuthHeaders()
    });
  }

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  getInstallateursBySpecialty(specialty: string): Observable<Installateur[]> {
  return this.http.get<Installateur[]>(
    `${this.apiUrl}/installateurs/by-specialty`, 
    {
      params: { specialty },
      headers: this.getAuthHeaders()
    }
  ).pipe(
    map(installateurs => installateurs.map(inst => ({
      ...inst,
      // Transformation des données pour correspondre à votre interface
      specialtyDisplay: this.translateSpecialty(inst.specialite),
      userId: inst.userId,
      username: inst.nom
    }))),
    catchError(this.handleError)
  );
}

// Dans InstallationsService

getInstallateursBySpecialties(specialties: string[]): Observable<{[specialty: string]: Installateur[]}> {
  return forkJoin(
    specialties.map(specialty => 
      this.getInstallateursBySpecialty(specialty).pipe(
        map(installateurs => ({ specialty, installateurs }))
      )
    )
  ).pipe(
    map(results => {
      const resultMap: {[specialty: string]: Installateur[]} = {};
      results.forEach(r => resultMap[r.specialty] = r.installateurs);
      return resultMap;
    })
  );
}

private translateSpecialty(specialty: string): string {
  const translations: { [key: string]: string } = {
    'Technicien en plomberie extérieure': 'Plomberie extérieure',
    'Électricien paysager': 'Électricité paysagère',
    'Paysagiste décorateur de bassins': 'Décoration bassins',
    'Installateur de bassins muraux': 'Bassins muraux',
    'Technicien en aquariophilie': 'Aquariophilie',
    'Maçon spécialisé en structures de bassins': 'Maçonnerie bassins'
  };
  return translations[specialty] || specialty;
}

private handleError(error: HttpErrorResponse) {
  let errorMessage = 'Erreur inconnue';
  if (error.error instanceof ErrorEvent) {
    errorMessage = `Erreur client: ${error.error.message}`;
  } else {
    errorMessage = `Erreur serveur: ${error.status} - ${error.error?.message || error.message}`;
  }
  console.error(errorMessage);
  return throwError(() => new Error(errorMessage));
}

  getInstallateursDisponibles(date: string, zone: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/installateurs/disponibles`, {
      params: { date, zone }
    });
  }

  /*affecterInstallateur(commandeId: number, installateurId: number, date: Date): Observable<any> {
    return this.http.post(`${this.apiUrl}/affectations/affecter-installateur`, {
      installateurId,
      dateInstallation: date.toISOString().split('T')[0]
    });
  }*/

    /**********Installateur functions***************/

    // pour récupérer l'ID de l'installateur
  getInstallateurIdByUserId(userId: number): Observable<number> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
    return this.http.get<number>(
      `${this.apiUrl}/installateurs/by-user/${userId}`,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Pour récupérer le userId à partir de l'ID d'installateur
  getUserIdByInstallateurId(installateurId: number): Observable<number> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    // Utilisez this.apiUrl qui pointe vers la bonne base URL
    return this.http.get<number>(
      `${this.apiUrl}/installateurs/by-installateur-id/${installateurId}/userId`,
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
}
getCommandesByInstallateur(installateurId: number, isUserId: boolean = false): Observable<CommandeResponse[]> {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.authService.getToken()}`
  });

  if (isUserId) {
    return this.getInstallateurIdByUserId(installateurId).pipe(
      switchMap(installateurId => {
        return this.http.get<CommandeResponse[]>(
          `${this.apiUrl}/affectations/installateur/${installateurId}/commandes`,
          { headers }
        ).pipe(
          map(commandes => commandes.map(c => ({
            ...c,
            dateCreation: c.dateCreation // Keep as string, handle conversion in component if needed
          }))) // Added missing closing parenthesis here
        );
      }),
      catchError(this.handleError)
    );
  } else {
    return this.http.get<CommandeResponse[]>(
      `${this.apiUrl}/affectations/installateur/${installateurId}/commandes`,
      { headers }
    ).pipe(
      map(commandes => commandes.map(c => ({
        ...c,
        dateCreation: c.dateCreation // Keep as string
      }))),
      catchError(this.handleError)
    );
  }
}

   // Récupérer tous les installateurs avec leur statut d'affectation
  getAllInstallateursWithStatus(): Observable<any[]> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    return this.http.get<any[]>(`${this.apiUrl}/installateurs/with-status`, { headers }).pipe(
      map(installateurs => installateurs.map(inst => ({
        ...inst,
        isAffected: this.checkIfAffected(inst)
      }))),
      catchError(this.handleError)
    );
  }

  private checkIfAffected(installateur: any): boolean {
    // Logique pour déterminer si l'installateur est affecté
    return installateur.affectations && installateur.affectations.length > 0;
  }

  getAllAffectations(): Observable<AffectationResponseDTO[]> {
  return this.http.get<AffectationResponseDTO[]>(`${this.apiUrl}/affectations`);
}

  //update
  updateAffectation(id: number, affectation: AffectationDTO): Observable<AffectationResponseDTO> {
    return this.http.put<AffectationResponseDTO>(`${this.apiUrl}/affectations/${id}`, affectation);
  }

  updateAffectationStatus(id: number, statut: string): Observable<AffectationResponseDTO> {
    return this.http.put<AffectationResponseDTO>(`${this.apiUrl}/affectations/${id}/statut/${statut}`, {});
  }

  // installations.service.ts

  getAffectationById(id: number): Observable<AffectationResponseDTO> {
    return this.http.get<AffectationResponseDTO>(`${this.apiUrl}/affectations/${id}`);
  }
  
  getAffectationIdByCommandeId(commandeId: number): Observable<number | null> {
  return this.http.get<{ affectationId: number }>(
    `${this.apiUrl}/affectations/commande/${commandeId}/affectation-id`
  ).pipe(
    map(response => response.affectationId),
    catchError(() => of(null)) // Retourne null si erreur ou non trouvé
  );
}

terminerAffectation(affectationId: number, userId: number): Observable<{message: string, isLastInstaller: boolean}> {
  return this.http.put<{message: string, isLastInstaller: boolean}>(
    `${this.apiUrl}/affectations/${affectationId}/terminer-installation`, 
    null,
    { headers: { 'X-User-Id': userId.toString() } }
  );
}

getInstallationStatus(affectationId: number, installateurId: number): Observable<{
    alreadyCompleted: boolean,
    isLastInstaller: boolean
  }> {
    return this.getInstallateurIdByUserId(installateurId).pipe(
      switchMap(userId => {
        return this.http.get<{
          alreadyCompleted: boolean,
          isLastInstaller: boolean
        }>(`${this.apiUrl}/affectations/${affectationId}/installation-status/${userId}`);
      })
    );
  }

  checkAvailability(data: {
    installateurId: number;
    dateInstallation: string;
    heureDebut: string;
    heureFin: string;
  }): Observable<{ available: boolean, message: string }> {
    return this.http.post<{ available: boolean, message: string }>(
      `${this.apiUrl}/installateurs/check-availability`,
      data
    );
  }

  
}
