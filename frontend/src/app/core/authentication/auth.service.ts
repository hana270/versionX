import { Injectable, Inject, PLATFORM_ID, forwardRef } from '@angular/core';
import { Router } from '@angular/router';
import {
  HttpClient,
  HttpErrorResponse,
  HttpEventType,
  HttpHeaders,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import Swal from 'sweetalert2';
import { catchError, filter, finalize, map, switchMap, tap } from 'rxjs/operators';
import { User } from '../models/user.model';
import { EMPTY, Observable, throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { SocialUser } from '@abacritt/angularx-social-login';
import { BehaviorSubject, of } from 'rxjs';
import { CartService } from '../services/cart.service';

import { Injector } from '@angular/core';
import { CartMigrationService } from '../services/cart-migration.service';
import { SessionService } from '../services/session.service';
import { AuthStateService } from '../services/auth-state.service';
import { ConfigServiceService } from '../services/config-service.service';
import { InstallerSpecialty } from '../models/installer-specialty.enum';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /*apiURL: string = 'http://localhost:8002/users';
  oauthURL = 'http://localhost:8080/oauth2';*/

   apiURL: string = 'http://localhost:8087/api/users';
  //private oauthURL: string;

  private JWT_KEY = 'jwt';
  private USER_KEY = 'current_user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
public currentUser$ = this.currentUserSubject.asObservable();
 
  public loggedUser: string = '';
  public isloggedIn: Boolean = false;
  public roles!: string[];
  public regitredUser: User = new User();
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);

  private loggedUserSubject = new BehaviorSubject<string>(this.loggedUser);
  public loggedUser$ = this.loggedUserSubject.asObservable();
  token: string | null = null;

  // Initialize the BehaviorSubject properly with a default value
  private loggedInStatus = new BehaviorSubject<boolean>(false);
  forceLogout: boolean | undefined;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private http: HttpClient,
    private jwtHelper: JwtHelperService,
    private authState: AuthStateService,
    private injector: Injector,
    private configService: ConfigServiceService,
   // @Inject(forwardRef(() => CartService)) private cartService: CartService
  ) {
    // Initialize URLs from config service
  //  this.apiURL = this.configService.usersApiUrl;
//    this.oauthURL = this.configService.apiUrl;

    // Initialiser les BehaviorSubjects
    this.loggedInStatus = new BehaviorSubject<boolean>(false);
    this.isLoggedInSubject = new BehaviorSubject<boolean>(false);
    this.loggedUserSubject = new BehaviorSubject<string>('');
    this.currentUserSubject = new BehaviorSubject<User | null>(null);

    if (isPlatformBrowser(this.platformId)) {
      // Restaurer l'état d'authentification
      this.verifyAuthIntegrity();
      this.initializeAuthState();

      // Configurer une vérification périodique de l'état d'authentification
      setInterval(() => {
        if (this.hasValidToken()) {
          console.log('Token valide, session maintenue');
        } else if (this.isloggedIn) {
          console.log('Token expiré, déconnexion...');
          this.logout();
        }
      }, 60000); // Vérifier toutes les minutes
    }
  }

  private get cartService(): CartService {
    return this.injector.get(CartService);
  }
  private initializeAuthState(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Essayer d'abord de charger jwt, puis token comme fallback
    let jwt = localStorage.getItem('jwt');
    if (!jwt) {
      const bearerToken = localStorage.getItem('token');
      if (bearerToken) {
        jwt = bearerToken.replace('Bearer ', '');
        localStorage.setItem('jwt', jwt); // Normaliser le stockage
      }
    }

    if (jwt) {
      try {
        const cleanJwt = jwt.startsWith('Bearer ') ? jwt.substring(7) : jwt;
        this.token = cleanJwt;

        const decodedToken = this.jwtHelper.decodeToken(cleanJwt);
        console.log('Decoded token in initializeAuthState:', decodedToken);

        if (this.jwtHelper.isTokenExpired(cleanJwt)) {
          console.log('Token expiré, déconnexion...');
          this.logout();
          return;
        }

        let userObj;
        const user = localStorage.getItem('user');
        if (user) {
          userObj = JSON.parse(user);
        } else {
          userObj = {
            username: decodedToken.sub || decodedToken.username,
            roles: decodedToken.roles || [],
            email: decodedToken.email,
          };
          localStorage.setItem('user', JSON.stringify(userObj));
        }

        this.isloggedIn = true;
        this.setLoggedInStatus(true);
        this.authState.updateAuthState(true);
        this.currentUserSubject.next(userObj);
        this.loggedUserSubject.next(userObj.username);
        this.loggedUser = userObj.username;
        this.roles = userObj.roles || [];

        console.log("État d'authentification initialisé avec succès");
      
      if (JSON.stringify(userObj) !== JSON.stringify(this.currentUserSubject.value)) {
  this.currentUserSubject.next(userObj);
  this.loggedUserSubject.next(userObj.username);
}
} catch (e) {
        console.error(
          "Erreur lors de l'initialisation de l'état d'authentification:",
          e
        );
        this.logout();
      }
    }
  }
  // Éviter d'injecter CartService directement dans le constructeur
  // Utiliser plutôt une méthode séparée pour la migration du panier
  public performCartMigration(): Observable<any> {
    const cartService = this.injector.get(CartService);
    return cartService.migrateSessionCartToUser();
  }

  // Method to check if a token exists and is valid
  hasValidToken(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('jwt');
      return (
        !!token && !this.jwtHelper.isTokenExpired(token.replace('Bearer ', ''))
      );
    }
    return false;
  }

  // Check token validity and update logged in status
  private checkTokenValidity(): void {
    const isLoggedIn = this.hasValidToken();
    this.setLoggedInStatus(isLoggedIn);
  }

  get isLoggedIn(): boolean {
    return this.authState.isLoggedIn;
  }

  get isLoggedIn$() {
    return this.authState.isLoggedIn$;
  }

  getToken(): string {
    if (!this.token && isPlatformBrowser(this.platformId)) {
      console.log('Token not available, attempting to load from localStorage');
      this.loadToken();
    }
    return this.token || '';
  }

  private decodeJWT(): void {
    if (!this.token) return;

    try {
      const cleanToken = this.token.replace('Bearer ', '');
      const decodedToken = this.jwtHelper.decodeToken(cleanToken);
      console.log('Token decoded:', decodedToken);

      this.roles = decodedToken.roles || [];
      this.loggedUser = decodedToken.sub || decodedToken.username;
      this.loggedUserSubject.next(this.loggedUser);
      this.isloggedIn = true;
      this.setLoggedInStatus(true);

      const currentUser = this.extractUserFromToken(cleanToken);
      this.currentUserSubject.next(currentUser);
      this.saveUserData(currentUser);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      this.logout();
    }
  }

  isTokenExpired(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('jwt');
      if (!token) return true;
      return this.jwtHelper.isTokenExpired(token.replace('Bearer ', ''));
    }
    return true;
  }
  getUserRole(): string | undefined {
    return this.roles?.[0];
  }
/*
  socialLogin(socialUser: SocialUser): Observable<any> {
    const payload = {
      email: socialUser.email,
      name: socialUser.name,
      idToken: socialUser.idToken,
      provider: socialUser.provider,
    };

    return this.http
      .post<any>(`${this.oauthURL}/social-login`, payload, {
        observe: 'response',
      })
      .pipe(
        tap((response) => {
          const jwt = response.headers.get('Authorization');
          if (jwt) {
            this.saveToken(jwt);
            this.setLoggedInStatus(true);
            // Migrer le panier après la connexion sociale réussie
            this.cartService.migrateSessionCartToUser().subscribe({
              next: () => {
                console.log('Panier migré avec succès après connexion sociale');
                this.redirectBasedOnRole();
              },
              error: (err) => {
                console.error('Erreur lors de la migration du panier:', err);
                this.redirectBasedOnRole();
              },
            });
          }
        }),
        catchError((error) => {
          console.error('Social login error:', error);
          Swal.fire(
            'Erreur',
            error.error?.message || 'Échec de la connexion sociale',
            'error'
          );
          return of(null);
        })
      );
  }
*/
  private readonly verifmailUrl = 'http://localhost:8087/api/users/verify-email';


  verifyEmail(
    email: string,
    code: string
  ): Observable<{ user: any; roles: string[]; token?: string }> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      observe: 'response' as const
    };

    return this.http.post<{
      user: any;
      roles: string[];
      message: string;
      token?: string;
    }>(
      this.verifmailUrl, // Utilisation directe de l'URL spécifique
      { email, code },
      httpOptions
    ).pipe(
      tap((response) => {
        // Récupère le token soit du header soit du body
        const jwt = response.headers.get('Authorization') || response.body?.token;
        if (jwt) {
          this.saveToken(jwt);
          this.setLoggedInStatus(true);
        }

        if (response.body?.user) {
          this.currentUserSubject.next(response.body.user);
          localStorage.setItem('currentUser', JSON.stringify(response.body.user));
        }
      }),
      map((response) => {
        if (!response.body) {
          throw new Error('Réponse vide du serveur');
        }

        return {
          user: response.body.user,
          roles: response.body.roles || [],
          token: response.body.token
        };
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Erreur de vérification email:', error);

        let errorMessage = 'Échec de la vérification de l\'email';
        const serverError = error.error;

        if (error.status === 0) {
          errorMessage = 'Erreur de connexion au serveur';
        } else if (error.status === 400) {
          errorMessage = serverError?.message || 'Requête invalide';
        } else if (error.status === 403) {
          errorMessage = 'Accès refusé - Code invalide ou expiré';
        } else if (error.status === 404) {
          errorMessage = 'Email non trouvé';
        } else if (serverError?.error) {
          switch (serverError.error) {
            case 'INVALID_CODE':
              errorMessage = 'Code de vérification invalide';
              break;
            case 'EXPIRED_CODE':
              errorMessage = 'Code expiré, veuillez en demander un nouveau';
              break;
            case 'ALREADY_VERIFIED':
              errorMessage = 'Cet email est déjà vérifié';
              break;
          }
        }

        return throwError(() => ({
          message: errorMessage,
          code: serverError?.error || 'UNKNOWN_ERROR',
          status: error.status
        }));
      })
    );
  }
  getInstallers(): Observable<any[]> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http
      .get<any[]>(`${this.apiURL}/list-installateurs`, { headers })
      .pipe(
        catchError((error) => {
          console.error('Error fetching installers:', error);
          throw new Error('Failed to load installers. Please try again.');
        })
      );
  }
  /*********************** */
  setLoggedInStatus(status: boolean): void {
    this.isloggedIn = status;
    this.loggedInStatus.next(status);
  }

  validateEmail(code: string, email?: string): Observable<User> {
    let url = `${this.apiURL}/verifyEmail/${code}`;
    if (email) {
      url += `?email=${encodeURIComponent(email)}`;
    }
    return this.http.get<User>(url).pipe(
      tap((user) => {
        this.regitredUser = user;
        this.roles = user.roles;
      })
    );
  }

  setRegistredUser(user: User) {
    this.regitredUser = user;
  }

  getRegistredUser() {
    return this.regitredUser;
  }

  updateProfile(
    username: string,
    newEmail?: string,
    newPassword?: string,
    currentPassword?: string
  ): Observable<any> {
    const token = this.getToken();
    if (!token) {
      return throwError(
        () => new Error('Authentication token missing. Please log in again.')
      );
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const payload = { username, newEmail, newPassword, currentPassword };

    return this.http
      .put(`${this.apiURL}/updateProfile`, payload, { headers })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error updating profile:', error);
          let errorMessage = 'Failed to update profile';
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  uploadProfileImage(
    file: File,
    username?: string,
    currentPassword?: string
  ): Observable<any> {
    // Get authentication token
    const token = this.getToken();
    if (!token) {
      return throwError(
        () => new Error('Authentication token missing. Please log in again.')
      );
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // If username not provided, get it from the token
    if (!username) {
      try {
        const decodedToken = this.jwtHelper.decodeToken(token);
        username = decodedToken.sub || decodedToken.username;
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    // Add username to form data if available
    if (username) {
      formData.append('username', username);
    }

    // Add password if provided
    if (currentPassword) {
      formData.append('currentPassword', currentPassword);
    }

    // Make the request with authentication headers
    return this.http
      .post(`${this.apiURL}/uploadProfileImage`, formData, { headers })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error uploading profile image:', error);

          let errorMessage = 'Failed to upload profile image';
          if (error.error?.message) {
            errorMessage = error.error.message;
          }

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  getCurrentUserEmail(): Observable<string> {
    if (isPlatformBrowser(this.platformId) && this.token) {
      try {
        const decodedToken = this.jwtHelper.decodeToken(this.token);
        console.log('Email récupéré du token:', decodedToken?.email);
        return of(decodedToken?.email || '');
      } catch (error) {
        console.error('Error decoding token for email:', error);
      }
    }
    return of(''); // Return empty on server or when token is invalid
  }

  getUserProfile(): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<any>(`${this.apiURL}/userProfile`, { headers });
  }

  getAllClients(): Observable<User[]> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<User[]>(`${this.apiURL}/all`, { headers }).pipe(
      catchError((error) => {
        console.error('Error fetching clients:', error);
        throw new Error('Failed to load clients. Please try again.');
      })
    );
  }

  isClient(): boolean {
    const roles = this.getUserRoles();
    return roles.includes('CLIENT');
  }

  isAdmin(): boolean {
    const roles = this.getUserRoles();
    return roles.includes('ADMIN');
  }

  isInstaller(): boolean {
    const roles = this.getUserRoles();
    return roles.includes('INSTALLATEUR');
  }

  requestResetPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiURL}/request-reset-password`, { email });
  }

  validateCode(email: string, code: string): Observable<any> {
    return this.http.post(`${this.apiURL}/validate-code`, { email, code });
  }

  resetPassword(email: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiURL}/reset-password`, {
      email,
      newPassword,
    });
  }

  hasAnyRole(requiredRoles: string[]): boolean {
    const userRoles = this.getUserRoles();
    return requiredRoles.some((role) => userRoles.includes(role));
  }

  getRequiredRoles(): string[] {
    return this.getUserRoles();
  }

  deactivateUser(userId: number): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put(
      `${this.apiURL}/deactivate/${userId}`,
      {},
      { headers }
    );
  }

  activateUser(userId: number): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put(`${this.apiURL}/activate/${userId}`, {}, { headers });
  }

getProfileImageUrl(): Observable<string> {
    return this.getUserProfile().pipe(
        map((user: any) => {
            if (!user.profileImage) {
                return 'assets/images/default-image-profile.webp';
            }
            
            // Si c'est déjà une URL complète
            if (user.profileImage.startsWith('http')) {
                return user.profileImage;
            }
            
            // Sinon, construire l'URL complète
            return `${this.apiURL }/photos_profile/${user.profileImage}`;
        }),
        catchError((error) => {
            console.error('Error getting profile image URL:', error);
            return of('assets/images/default-image-profile.webp');
        })
    );
}
  updateInstallerSpecialty(userId: number, specialty: InstallerSpecialty): Observable<any> {
    const params = new HttpParams().set('specialty', specialty);
    return this.http.put(`${this.apiURL}/installateurs/${userId}/specialty`, {}, { params });
  }
  getUserId(): number | null {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('jwt');
      if (token) {
        try {
          const decodedToken = this.jwtHelper.decodeToken(token);
          // Vérifiez la structure de votre token pour voir où est stocké l'ID
          return decodedToken?.userId || decodedToken?.sub || null;
        } catch (error) {
          console.error('Error decoding token for userId:', error);
          return null;
        }
      }
    }
    return null;
  }

  getUserEmail(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      const token = this.getToken();
      if (token) {
        try {
          const decodedToken = this.jwtHelper.decodeToken(token);
          console.log('Email from token:', decodedToken?.email); // Afficher l'email dans la console
          return decodedToken?.email || null;
        } catch (error) {
          console.error('Error decoding token for email:', error);
        }
      }
    }
    return null;
  }
  getInstallerss(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiURL}/installateurs`).pipe(
      map(users => users.map(user => ({
        ...user,
        profileImage: user.profileImage ? `${this.apiURL}/uploads/${user.profileImage}` : 'assets/images/default-image-profile.webp',
        specialty: user.specialty ? user.specialty : 'NON_SPECIFIED'
      })))
    );
  }

  /**
   * Rafraîchit le token JWT
   */
  refreshToken(): Observable<string> {
    if (!isPlatformBrowser(this.platformId)) {
      return throwError(
        () => new Error('Refresh token impossible on server-side')
      );
    }

    const currentToken = this.getToken();
    if (!currentToken) {
      return throwError(() => new Error('No token available for refresh'));
    }

    return this.http
      .post<{ token: string }>(
        `${this.apiURL}/refresh-token`,
        {},
        {
          headers: new HttpHeaders().set('Authorization', currentToken),
        }
      )
      .pipe(
        tap((response) => {
          const newToken = response.token;
          this.handleSuccessfulAuth(newToken);
          console.log('Token refreshed successfully');
        }),
        map((response) => response.token),
        catchError((error) => {
          console.error('Error refreshing token:', error);
          this.logout();
          return throwError(() => new Error('Token refresh failed'));
        })
      );
  }

  resendVerificationCode(email: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    return this.http
      .post(`${this.apiURL}/resend-verification`, { email }, { headers })
      .pipe(
        tap(() => {
          Swal.fire({
            icon: 'success',
            title: 'Code renvoyé',
            text: 'Un nouveau code de vérification a été envoyé à votre adresse email',
            confirmButtonText: 'OK',
          });
        }),
        catchError((error) => {
          console.error('Resend code error:', error);
          let errorMessage = "Échec de l'envoi du code";
          if (error.error?.error === 'USER_NOT_FOUND') {
            errorMessage = 'Aucun utilisateur trouvé avec cet email';
          } else if (error.error?.error === 'ALREADY_VERIFIED') {
            errorMessage = 'Ce compte a déjà été vérifié';
          }

          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: errorMessage,
            confirmButtonText: 'OK',
          });

          return throwError(() => new Error(errorMessage));
        })
      );
  }

  clearAllAuthData(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.JWT_KEY);
      localStorage.removeItem('currentUser');

      this.token = '';
      this.roles = [];
      this.loggedUser = '';
      this.isloggedIn = false;

      this.currentUserSubject.next(null);
      this.authState.updateAuthState(false);
    }
  }

  public get isAuthenticated$(): Observable<boolean> {
    return this.authState.isLoggedIn$;
  }

 registerInstaller(installerData: any): Observable<any> {
  const url = 'http://localhost:8087/api/users/registerinstaller';
  
  return this.http.post<any>(url, installerData, {
    observe: 'response',
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  }).pipe(
    tap((response) => {
      if (response.status === 200 && response.body?.message?.includes('code de vérification')) {
        Swal.fire('Succès', response.body.message, 'success');
        this.router.navigate(['/email-verification'], {
          state: { 
            email: installerData.email,
            specialty: installerData.specialty
          }
        });
      }
    }),
    catchError((error) => {
      let errorMsg = 'Erreur lors de l\'inscription';
      if (error.error?.error) {
        errorMsg = error.error.error;
      } else if (error.error?.message) {
        errorMsg = error.error.message;
      }
      Swal.fire('Erreur', errorMsg, 'error');
      return throwError(() => error);
    })
  );
}

  private handleAuthentication(token: string, userData: any): void {
    // Décoder le token
    const decodedToken = this.decodeJWTToken(token);
    
    // Stocker les informations
    localStorage.setItem('auth_token', token);
    
    const user = userData || {
      username: decodedToken?.sub,
      email: decodedToken?.email,
      roles: decodedToken?.roles || []
    };
    
    localStorage.setItem('user', JSON.stringify(user));
    
    // Redirection basée sur le rôle
    this.redirectBasedOnRole();
  }
  private handleRegistrationError(error: HttpErrorResponse): Observable<never> {
    console.error('Registration error:', error);
    
    let errorMessage = "Échec de l'inscription";
    if (error.error) {
      if (typeof error.error === 'string') {
        try {
          const errorObj = JSON.parse(error.error);
          errorMessage = errorObj.error || errorObj.message || errorMessage;
        } catch {
          errorMessage = error.error;
        }
      } else if (error.error.message) {
        errorMessage = error.error.message;
      } else if (error.error.error) {
        errorMessage = error.error.error;
      }
    }

    Swal.fire('Erreur', errorMessage, 'error');
    return throwError(() => new Error(errorMessage));
  }

  private extractJwtToken(response: HttpResponse<any>): string | null {
    return response.headers.get('Authorization')?.replace('Bearer ', '') ||
           response.body?.accessToken ||
           response.body?.token;
  }


  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.error) return error.error.error;
    if (error.error?.message) return error.error.message;
    if (typeof error.error === 'string') {
      try {
        const err = JSON.parse(error.error);
        return err.message || err.error || error.message;
      } catch {
        return error.error || error.message;
      }
    }
    return error.message || "Erreur inconnue";
  }
  

  sendInstallerInvitation(email: string, specialty: string): Observable<any> {
    const token = localStorage.getItem('auth_token');
    
    return this.http.post(
      'http://localhost:8087/api/users/send-installer-invitation',
      { email, specialty },
      {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        })
      }
    ).pipe(
      catchError(error => {
        console.error('Erreur complète:', error);
        if (error.status === 401) {
          throw 'Session expirée, veuillez vous reconnecter';
        } else {
          throw `Erreur serveur (${error.status}): ${error.message}`;
        }
      })
    );
}

  getUserByEmail(email: string): Observable<User | null> {
    // Implement this method to fetch user by email from your API
    return this.http.get<User>(`${this.apiURL}/email/${email}`);
  }

  getCurrentCartId(): string | null {
    // Implement logic to get the current cart ID
    // This depends on how your cart is stored
    return localStorage.getItem('currentCartId'); // Example
  }
  /**
   * Checks if the user is authenticated without redirecting
   * @returns boolean - true if authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    // Check if token is valid and not expired
    try {
      const decodedToken = this.decodeJWTToken(token);
      const currentTime = Date.now() / 1000;
      if (decodedToken && decodedToken.exp && decodedToken.exp > currentTime) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  decodeJWTToken(token: string): any {
    try {
      const cleanToken = token.replace('Bearer ', '');
      const decodedToken = this.jwtHelper.decodeToken(cleanToken);
      console.log('Token decoded:', decodedToken);
      return decodedToken;
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }
  // Service d'authentification (auth.service.ts)

  registerUser(registrationData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    defaultAddress: string;
  }): Observable<any> {
    const userToRegister = {
      ...registrationData,
      roles: ['CLIENT']
    };
    
    // URL directe comme demandé
    const registerUrl = 'http://localhost:8087/api/users/register';
    
    // Utiliser JSON pour la communication avec le backend
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
    
    // Utiliser responseType: 'json' pour traiter correctement la réponse du serveur
    return this.http.post(registerUrl, userToRegister, httpOptions).pipe(
      tap(response => {
        console.log('Registration successful:', response);
        
        // Afficher le message de succès et rediriger
        Swal.fire(
          'Inscription réussie',
          'Votre compte a été créé. Veuillez vérifier votre email.',
          'success'
        ).then(() => {
          this.router.navigate(['/verifEmail']);
        });
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Registration error details:', error);
        
        let errorMessage = "Échec de l'inscription";
        
        // Tenter d'extraire le message d'erreur du backend
        if (error.error && typeof error.error === 'object') {
          // Si l'erreur est un objet JSON
          errorMessage = error.error.message || error.error.error || JSON.stringify(error.error);
        } else if (error.error && typeof error.error === 'string') {
          try {
            // Essayer de parser le message d'erreur s'il est en format JSON string
            const errorObj = JSON.parse(error.error);
            errorMessage = errorObj.message || errorObj.error || error.error;
          } catch (e) {
            // Si ce n'est pas du JSON valide, utiliser tel quel
            errorMessage = error.error;
          }
        }
        
        // Gérer différemment selon le code d'erreur
        if (error.status === 409) {
          // Conflit - email ou username déjà utilisé
          Swal.fire('Attention', errorMessage, 'warning');
        } else {
          // Autres erreurs
          Swal.fire('Erreur', errorMessage, 'error');
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }
  private extractUserFromToken(token: string): any {
    const decoded = this.jwtHelper.decodeToken(token);
    return {
      username: decoded.sub || decoded.username,
      roles: decoded.roles || [],
    };
  }

  private redirectBasedOnRole(): void {
    const roles = this.getUserRoles();

    if (!roles || roles.length === 0) {
      this.router.navigate(['/homepage']);
      return;
    }

    // Vérifier les rôles par ordre de priorité
    if (roles.includes('ADMIN')) {
      this.router.navigate(['/admin/dashboard']);
    } else if (roles.includes('INSTALLATEUR')) {
      this.router.navigate(['/installer-home']);
    } else if (roles.includes('CLIENT')) {
      this.router.navigate(['/homepage']);
    } else {
      this.router.navigate(['/homepage']);
    }
  }

  getUserRoles(): string[] {
    // Essayer de récupérer depuis userData d'abord
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.roles) return user.roles;
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }

    // Sinon décoder depuis le JWT
    const jwt = localStorage.getItem('jwt');
    if (jwt) {
      try {
        const decoded = this.decodeJWTToken(jwt);
        return decoded.roles || [];
      } catch (e) {
        console.error('Error decoding JWT', e);
      }
    }

    return [];
  }

  // Utilitaire pour décoder le JWT
  deJWT(): void {
    if (!this.token) return;

    try {
      const cleanToken = this.token.replace('Bearer ', '');
      const decodedToken = this.jwtHelper.decodeToken(cleanToken);
      console.log('Token decoded:', decodedToken);

      this.roles = decodedToken.roles || [];
      this.loggedUser = decodedToken.sub || decodedToken.username;
      this.loggedUserSubject.next(this.loggedUser);
      this.isloggedIn = true;
      this.setLoggedInStatus(true);

      const currentUser = this.extractUserFromToken(cleanToken);
      this.currentUserSubject.next(currentUser);
      this.saveUserData(currentUser);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      this.logout();
    }
  }

  saveToken(jwt: string) {
    if (isPlatformBrowser(this.platformId)) {
      if (jwt?.startsWith('Bearer ')) {
        jwt = jwt.substring(7);
      }
      localStorage.setItem('jwt', jwt);

      this.authState.updateAuthState(true, jwt);

      this.token = jwt;
      this.decodeJWT();
    }
  }

  private loadCurrentUser(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const userStr = localStorage.getItem(this.USER_KEY);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch (e) {
        console.error('Error parsing user data', e);
        this.clearAuthData();
      }
    }
  }
  private clearAuthData(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.removeItem(this.JWT_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('token');

    this.token = '';
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
    this.authState.updateAuthState(false);
  }
  loadToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        // Essayer d'abord de charger jwt puis token comme fallback
        const jwt = localStorage.getItem('jwt');
        const bearerToken = localStorage.getItem('token');

        if (jwt) {
          this.token = jwt;
          console.log('Token chargé depuis jwt:', jwt);
        } else if (bearerToken) {
          this.token = bearerToken.replace('Bearer ', '');
          // Restaurer jwt s'il manque
          localStorage.setItem('jwt', this.token);
          console.log('Token chargé depuis token bearer:', this.token);
        }

        if (this.token) {
          this.decodeJWT();
        }
      } catch (e) {
        console.error('Erreur lors du chargement du token:', e);
      }
    }
  }
  checkAuthState(): Observable<boolean> {
    return of(this.hasValidToken()).pipe(
      tap((isValid) => {
        if (!isValid) {
          this.clearAuthData();
        }
      })
    );
  }

  // Méthode pour vérifier l'intégrité des données d'authentification
  verifyAuthIntegrity(): void {
    if (isPlatformBrowser(this.platformId)) {
      const jwt = localStorage.getItem('jwt');
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      // Si token existe mais pas jwt, restaurer jwt
      if (!jwt && token) {
        localStorage.setItem('jwt', token.replace('Bearer ', ''));
      }

      // Si jwt existe mais pas token, restaurer token
      if (jwt && !token) {
        localStorage.setItem('token', `Bearer ${jwt}`);
      }
    }
  }

  // Méthode pour éviter de nettoyer jwt lors des redirections
  clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log('État avant clearSession:', {
        jwt: localStorage.getItem('jwt'),
        token: localStorage.getItem('token'),
        user: localStorage.getItem('user'),
      });

      // Conserver une copie de sauvegarde des tokens
      const jwt = localStorage.getItem('jwt');
      const token = localStorage.getItem('token');

      // Seulement supprimer si explicitement demandé pour la déconnexion
      if (this.forceLogout) {
        localStorage.removeItem('jwt');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Réinitialiser l'état
        this.token = '';
        this.isloggedIn = false;
        this.setLoggedInStatus(false);
        this.authState.updateAuthState(false);
        this.forceLogout = false;
      }

      console.log('État après clearSession:', {
        jwt: localStorage.getItem('jwt'),
        token: localStorage.getItem('token'),
        user: localStorage.getItem('user'),
      });
    }
  }

  // Handle successful authentication
  // Amélioration de la méthode handleSuccessfulAuth pour assurer la persistance
  

  //installateur
private handleSuccessfulAuth(jwt: string, userData?: any): void {
    if (isPlatformBrowser(this.platformId)) {
      // Nettoyer le JWT (enlever 'Bearer ' si présent)
      const cleanJwt = jwt.startsWith('Bearer ') ? jwt.substring(7) : jwt;

      // Stocker dans localStorage sous forme standard et avec Bearer
      localStorage.setItem('jwt', cleanJwt); // Stocker sans 'Bearer ' pour uniformité
      localStorage.setItem('token', `Bearer ${cleanJwt}`);

      // Mettre à jour les propriétés du service
      this.token = cleanJwt;

      // Extraire et stocker les données utilisateur
      try {
        const decodedToken = this.jwtHelper.decodeToken(cleanJwt);
        
        // Créer l'objet utilisateur complet
        const user = {
          ...(userData || {}), // Priorité aux données du body si existantes
          userId: decodedToken.userId || userData?.userId, // Récupération de l'ID utilisateur
          username: decodedToken.sub || decodedToken.username || userData?.username,
          roles: decodedToken.roles || userData?.roles || [],
          email: decodedToken.email || userData?.email,
          // Ajoutez ici d'autres champs si nécessaire
        };

        // Stocker les informations utilisateur
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
        this.loggedUser = user.username;
        this.loggedUserSubject.next(user.username);
        this.roles = user.roles;

        // Mettre à jour l'état d'authentification
        this.isloggedIn = true;
        this.setLoggedInStatus(true);
        this.authState.updateAuthState(true, cleanJwt);

        console.log('Authentification réussie, données sauvegardées:', {
          jwt: cleanJwt,
          user: user,
          userId: user.userId // Ajout du userId dans les logs
        });

        // Migrer le panier si nécessaire
        this.performCartMigration().subscribe({
          next: () => console.log('Panier migré avec succès'),
          error: (err) => console.error('Erreur de migration du panier:', err),
        });

      } catch (error) {
        console.error('Erreur lors du décodage du token:', error);
      }
    }
  }


  /************************** */
  // Méthode de login améliorée

  //installateur
 login(credentials: { username: string; password: string }): Observable<HttpResponse<any>> {
  return this.http.post<any>(`${this.apiURL}/login`, credentials, {
    observe: 'response',
    withCredentials: true,
  }).pipe(
    tap((response) => {
      console.log('Réponse de login reçue:', response);

      // Vérifier si le token est dans le corps ou les en-têtes de la réponse
      let jwt = response.body?.token || response.headers.get('Authorization');

      if (jwt) {
        console.log('JWT trouvé dans la réponse:', jwt);
        
        // Récupérer l'ID utilisateur depuis le corps de la réponse
        const userId = response.body?.user?.userId;
        console.log('ID utilisateur:', userId);
        
        this.handleSuccessfulAuth(jwt, userId); // Passer l'ID utilisateur

        // Rediriger après le login réussi
        setTimeout(() => this.redirectBasedOnRole(), 100);
      } else {
        console.error('Aucun JWT trouvé dans la réponse');
        throw new Error('Token manquant dans la réponse');
      }
    }),
    catchError((error) => {
      console.error('Erreur de connexion:', error);
      return throwError(() => new Error('Échec de la connexion'));
    })
  );
}

  private storeAuthData(jwt: string, userData?: any): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Clean the JWT (remove 'Bearer ' prefix if present)
    const cleanJwt = jwt.startsWith('Bearer ') ? jwt.substring(7) : jwt;

    // Store in localStorage
    localStorage.setItem('jwt', cleanJwt);
    localStorage.setItem('token', `Bearer ${cleanJwt}`);

    // Update service properties
    this.token = cleanJwt;

    // Extract and store user data
    const user = userData || this.extractUserFromToken(cleanJwt);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      this.currentUserSubject.next(user);
      this.loggedUser = user.username;
      this.loggedUserSubject.next(user.username);
      this.roles = user.roles || [];
    }

    // Update auth state
    this.isloggedIn = true;
    this.setLoggedInStatus(true);
    this.authState.updateAuthState(true);

    console.log('Auth data stored:', {
      jwt: localStorage.getItem('jwt'),
      user: localStorage.getItem('user'),
    });
  }

  private saveUserData(user: any): void {
    // Implement logic to save user data if needed
    console.log('User data saved:', user);
  }

  logout(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Marquer explicitement la déconnexion
    this.forceLogout = true;

    // Supprimer toutes les données d'authentification
    localStorage.removeItem('jwt');
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Réinitialiser les états
    this.token = '';
    this.isloggedIn = false;
    this.setLoggedInStatus(false);
    this.authState.updateAuthState(false);

    // Rediriger vers la page de login
    this.router.navigate(['/login']);
  }

   //méthode installateur commande 
   getInstallersCommande(): Observable<any[]> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<User[]>(`${this.configService.usersApiUrl}/installateursCommmande`, { headers }).pipe(
      map(users => users.map(user => ({
        id: user.user_id,
        userId: user.user_id, // Add this to match backend
        username: user.username,
        email: user.email,
        profileImage: user.profileImage 
          ? `${this.configService.apiUrl}/uploads/${user.profileImage}` 
          : 'assets/img/installateur/inconnueProfilephoto.jpg',
        prenom: 'Non spécifié',
        nom: 'Non spécifié',
        specialite: 'Non spécifiée'
      }))),
      catchError((error) => {
        console.error('Error fetching installers:', error);
        return of([]);
      })
    );
}
 
}
