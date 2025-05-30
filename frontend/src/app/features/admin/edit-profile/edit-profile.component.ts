import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/authentication/auth.service';
import Swal from 'sweetalert2';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.css'],
})
export class EditProfileComponent implements OnInit {
  emailForm: FormGroup;
  passwordForm: FormGroup;
  profileImageForm: FormGroup;
  message: string = '';
  isSuccess: boolean = false;
  showCurrentPassword: boolean = false;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;
  currentEmail: string = '';
  currentUsername: string = ''; // Ajouté
  activeTab: string = 'email';
  profileImageUrl: string = 'assets/images/default-profile-profile.webp'; // Chemin modifié
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.emailForm = this.fb.group({
      newEmail: ['', [Validators.email, Validators.required]],
      currentPassword: ['', [Validators.required]],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validator: this.passwordMatchValidator }
    );

    this.profileImageForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      file: [null, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadCurrentEmail();
    this.loadCurrentImage(); // Charger l'image de profil actuelle
  }

  // Modifier la méthode loadCurrentImage
  private loadCurrentImage(): void {
    this.authService.getProfileImageUrl().subscribe({
      next: (imageUrl: string) => {
        // Ajouter un timestamp pour éviter le cache
        this.profileImageUrl = this.addCacheBuster(imageUrl);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.profileImageUrl = 'assets/images/default-image-profile.webp';
        this.cdr.detectChanges();
      },
    });
  }

  // Ajouter cette méthode
  private addCacheBuster(url: string): string {
    if (!url) return url;
    return url.includes('?')
      ? `${url}&t=${Date.now()}`
      : `${url}?t=${Date.now()}`;
  }

  // Modifier onUpdateProfileImage
  onUpdateProfileImage(): void {
    if (!this.selectedFile) return;

    const currentPassword = this.profileImageForm.get('currentPassword')?.value;
    const username = this.authService.loggedUser;

    this.authService
      .uploadProfileImage(this.selectedFile, username, currentPassword)
      .subscribe({
        next: (response: any) => {
          this.showMessage('Photo mise à jour avec succès', true);
          this.profileImageUrl = this.addCacheBuster(response.imageUrl);
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.showMessage('Erreur de mise à jour', false);
        },
      });
  }

  private loadUserProfile(): void {
    this.authService.getUserProfile().subscribe({
      next: (user: any) => {
        this.currentEmail = user.email;
        this.currentUsername = user.username;

        // Utilisation de la méthode du service
        this.authService.getProfileImageUrl().subscribe((imageUrl) => {
          this.profileImageUrl = imageUrl;
          this.cdr.detectChanges();
        });
      },
      error: (error: any) => {
        this.showMessage(
          'Erreur lors de la récupération des informations',
          false
        );
        this.profileImageUrl = 'assets/images/default-profile.jpg'; // Fallback
      },
    });
  }

  private loadCurrentEmail(): void {
    this.authService.getUserProfile().subscribe({
      next: (user: any) => {
        this.currentEmail = user.email;
      },
      error: (error: any) => {
        this.showMessage(
          'Erreur lors de la récupération des informations',
          false
        );
      },
    });
  }

  handleImageError(event: any) {
    event.target.src = 'assets/images/default-image-profile.webp';
    this.cdr.detectChanges();
  }
  passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleShowCurrentPassword(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleShowNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile) {
      this.promptForCurrentPassword().then((currentPassword) => {
        if (currentPassword) {
          this.profileImageForm
            .get('currentPassword')
            ?.setValue(currentPassword);
          this.onUpdateProfileImage();
        }
      });
    }
  }

  private promptForCurrentPassword(): Promise<string> {
    return Swal.fire({
      title: 'Valider le mot de passe actuel',
      input: 'password',
      inputPlaceholder: 'Entrez votre mot de passe actuel',
      showCancelButton: true,
      confirmButtonText: 'Valider',
      cancelButtonText: 'Annuler',
      inputValidator: (value) => {
        if (!value) {
          return 'Le mot de passe est requis !';
        }
        return null;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        return result.value;
      }
      return null;
    });
  }

  onUpdateEmail(): void {
    if (this.emailForm.invalid) {
      this.showMessage('Veuillez remplir tous les champs obligatoires.', false);
      return;
    }

    const { newEmail, currentPassword } = this.emailForm.value;
    const username = this.authService.loggedUser;
    console.log('Username being sent:', username); // Debug log

    if (!username) {
      this.showMessage(
        'Utilisateur non connecté. Veuillez vous reconnecter.',
        false
      );
      return;
    }

    this.authService
      .updateProfile(username, newEmail, undefined, currentPassword)
      .subscribe({
        next: () => {
          this.showMessage('Email mis à jour avec succès.', true);
          this.emailForm.reset();
          this.loadCurrentEmail();
        },
        error: (error: any) => {
          this.showMessage(
            error.error.message || 'Une erreur est survenue.',
            false
          );
        },
      });
  }

  onUpdatePassword(): void {
    if (this.passwordForm.invalid) {
      this.showMessage('Veuillez remplir tous les champs obligatoires.', false);
      return;
    }

    const { newPassword, currentPassword } = this.passwordForm.value;
    const username = this.authService.loggedUser;

    this.authService
      .updateProfile(username, undefined, newPassword, currentPassword)
      .subscribe({
        next: () => {
          this.showMessage('Mot de passe mis à jour avec succès.', true);
          this.passwordForm.reset();
        },
        error: (error: any) => {
          this.showMessage(
            error.error.message || 'Une erreur est survenue.',
            false
          );
        },
      });
  }

  private showMessage(message: string, isSuccess: boolean): void {
    Swal.fire({
      icon: isSuccess ? 'success' : 'error',
      title: isSuccess ? 'Succès' : 'Erreur',
      text: message,
      timer: 2000,
      showConfirmButton: false,
    });
  }

  // Ajoutez ces méthodes pour la force du mot de passe
calculatePasswordStrength(): number {
    const password = this.passwordForm.get('newPassword')?.value;
    if (!password) return 0;
    
    let strength = 0;
    if (password.length >= 8) strength += 30;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 30;
    
    return Math.min(strength, 100);
}

getPasswordStrengthColor(): string {
    const strength = this.calculatePasswordStrength();
    if (strength < 40) return '#e74c3c';
    if (strength < 70) return '#f39c12';
    return '#2ecc71';
}
}
