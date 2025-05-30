import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { isPlatformBrowser } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public isLoggedIn$ = this.isLoggedInSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(
    private jwtHelper: JwtHelperService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loadStoredAuthState();
  }

  // Load stored auth state from localStorage on service initialization
  private loadStoredAuthState(): void {
    if (isPlatformBrowser(this.platformId)) {
      const storedToken = localStorage.getItem('jwt');
      if (storedToken) {
        try {
          // Check if token is valid and not expired
          if (!this.jwtHelper.isTokenExpired(storedToken)) {
            this.tokenSubject.next(storedToken);
            this.isLoggedInSubject.next(true);
            
            // Load user data from token
            const user = this.extractUserFromToken(storedToken);
            if (user) {
              this.currentUserSubject.next(user);
            }
          } else {
            // Token is expired, clear storage
            this.clearAuthState();
          }
        } catch (error) {
          console.error('Error loading stored auth state:', error);
          this.clearAuthState();
        }
      }
    }
  }

  get currentToken(): string | null {
    return this.tokenSubject.value;
  }

  get token(): string | null {
    return this.currentToken;
  }

  get isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

 updateAuthState(isLoggedIn: boolean, token?: string, user?: User | null): void {
  this.isLoggedInSubject.next(isLoggedIn);

  if (token) {
    this.tokenSubject.next(token);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('jwt', token);
    }
    
    // Extract user from token if not provided
    if (!user) {
      user = this.extractUserFromToken(token);
    }
  }

  if (user) {
    this.currentUserSubject.next(user);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  } else if (user === null) {
    this.currentUserSubject.next(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('currentUser');
    }
  }

  if (!isLoggedIn) {
    this.clearAuthState();
  }
}

  clearAuthState(): void {
    this.isLoggedInSubject.next(false);
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('jwt');
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    }
  }

  getCurrentUserId(): number | null {
    const user = this.getCurrentUser();
    return user?.user_id || null;
  }

  getToken(): string | null {
    return this.currentToken;
  }

  getAuthHeaders(): HttpHeaders {
    const headers = new HttpHeaders();
    const token = this.currentToken;

    if (token && !this.jwtHelper.isTokenExpired(token)) {
      return headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  getCurrentUser(): User | null {
    // First check if we already have the user in the subject
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      return currentUser;
    }
    
    // If not, try to extract from token
    const token = this.token;
    if (token) {
      const user = this.extractUserFromToken(token);
      if (user) {
        // Update the subject for consistency
        this.currentUserSubject.next(user);
        return user;
      }
    }
    
    return null;
  }

  
    get currentUserId(): number | null {
    const token = this.tokenSubject.value;
    if (!token) return null;
    
    try {
      const decoded = this.jwtHelper.decodeToken(token);
      // Assurez-vous que votre token JWT contient bien un champ userId numérique
      return decoded?.userId ? Number(decoded.userId) : null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

extractUserFromToken(token: string): User | null {
  if (!token) return null;
  
  try {
    const decodedToken = this.jwtHelper.decodeToken(token);
    console.log('Decoded token data:', decodedToken);
    
    if (decodedToken) {
      const user = new User();
      
      // Extraction des données basée sur la structure réelle de votre token
      user.user_id = Number(decodedToken.userId || decodedToken.sub || decodedToken.user_id);
      user.username = decodedToken.username || decodedToken.preferred_username || decodedToken.sub || '';
      user.email = decodedToken.email || '';
      
      // Ces champs semblent vides dans votre exemple, donc on les laisse vides par défaut
      user.firstName = decodedToken.firstName || decodedToken.given_name || '';
      user.lastName = decodedToken.lastName || decodedToken.family_name || '';
      user.phone = decodedToken.phone || decodedToken.phone_number || '';
      user.defaultAddress = decodedToken.defaultAddress || '';
      
      // Gestion des rôles
      user.roles = decodedToken.roles || [];
      if (typeof user.roles === 'string') {
        user.roles = [user.roles]; // Convertir en tableau si c'est une string
      }
      
      // Ajout des autres champs de votre modèle User
      user.enabled = decodedToken.enabled || false;
      user.profileImage = decodedToken.profileImage || '';
      
      console.log('Extracted user:', user);
      return user;
    }
  } catch (error) {
    console.error('Error decoding token:', error);
  }
  
  return null;
}

}