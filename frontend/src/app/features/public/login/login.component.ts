import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../../core/authentication/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html' 
})
export class LoginComponent implements OnInit {
  user: User = new User();
  err: number = 0;
  message: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    console.log('LoginComponent initialized');
    
    // Debug logs
    if (typeof this.authService.isLoggedIn !== 'undefined') {
      console.log('Login state:', this.authService.isLoggedIn);
      
      // Check for tokens in localStorage
      if (localStorage.getItem('jwt')) {
        console.log('JWT token found in localStorage');
      }
      
      if (localStorage.getItem('token')) {
        console.log('Token found in localStorage');
      }
    }
  }

  async onLoggedin() {
    this.isLoading = true;
    this.err = 0;
    this.message = '';

    try {
      // Validation
      if (!this.user.username || !this.user.password) {
        throw new Error('Veuillez renseigner votre nom d\'utilisateur et mot de passe');
      }

      // Appel au service
      const response = await this.authService.login({
        username: this.user.username,
        password: this.user.password
      }).toPromise();

      // Vérification du stockage
      const storedJwt = localStorage.getItem('jwt');
      const storedToken = localStorage.getItem('token');
      
      if (!storedJwt && !storedToken) {
        throw new Error('Les tokens de connexion n\'ont pas été stockés correctement');
      }
      
      console.log('Tokens après login:', {
        jwt: storedJwt,
        token: storedToken
      });

      // Vérifier l'intégrité de l'authentification
      this.authService.verifyAuthIntegrity();

      // Redirection
      await this.redirectBasedOnRole();
      
      // Confirmation
      Swal.fire({
        icon: 'success',
        title: 'Connexion réussie',
        text: 'Bienvenue sur votre espace personnel',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Login error:', error);
      this.handleError('Échec de connexion', this.getErrorMessage(error));
    } finally {
      this.isLoading = false;
    } 
  }

  private getErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    } else if (typeof error === 'string') {
      return error;
    } else if (error?.error?.message) {
      return error.error.message;
    } else if (error?.message) {
      return error.message;
    }
    return 'Une erreur inconnue est survenue';
  }

  private handleError(title: string, errorMessage: string) {
    this.err = 1;
    this.message = errorMessage;
    
    Swal.fire({
      icon: 'error',
      title: title,
      text: errorMessage,
      confirmButtonText: 'OK',
      confirmButtonColor: '#3085d6'
    });
  }

  private async redirectBasedOnRole() {
    try {
      // Vérifier l'intégrité avant de rediriger
      this.authService.verifyAuthIntegrity();
      
      if (this.authService.isAdmin()) {
        await this.router.navigate(['/admin/dashboard']);
      } else if (this.authService.isInstaller()) {
        await this.router.navigate(['/installer-home']);
      } else if (this.authService.isClient()) {
        await this.router.navigate(['/homepage']);
      } else {
        await this.router.navigate(['/homepage']);
      }
    } catch (error) {
      console.error('Error during role-based redirection:', error);
      await this.router.navigate(['/homepage']);
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}