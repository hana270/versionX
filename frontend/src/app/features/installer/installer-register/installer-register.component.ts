import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/authentication/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-installer-register',
  templateUrl: './installer-register.component.html',
  styleUrls: ['./installer-register.component.css']
})
export class InstallerRegisterComponent implements OnInit {
  registerForm: FormGroup;
  isLoading: boolean = false;
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isInvitation: boolean = false;
  predefinedSpecialty: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.registerForm = this.createForm();
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['specialty']) {
        this.isInvitation = true;
        this.predefinedSpecialty = params['specialty'];
        
        this.registerForm.patchValue({
          specialty: this.predefinedSpecialty
        });

        if (params['email']) {
          this.registerForm.patchValue({
            email: params['email']
          });
        }
      }
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8,}$/)]],
      defaultAddress: ['', Validators.required],
      specialty: [{value: '', disabled: true}] // Désactivé car défini par l'admin
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    return password?.value === confirmPassword?.value ? null : { mismatch: true };
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  register() {
    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
      
      Swal.fire({
        icon: 'error',
        title: 'Formulaire incomplet',
        text: 'Veuillez remplir tous les champs correctement',
        confirmButtonColor: '#3a7bd5',
      });
      return;
    }
  
    this.isLoading = true;
    const formData = this.registerForm.getRawValue(); // Utilisez getRawValue() pour inclure les champs désactivés
    delete formData.confirmPassword;
  
    this.authService.registerInstaller(formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        localStorage.setItem('pendingVerificationEmail', formData.email);
        
        Swal.fire({
          icon: 'success',
          title: 'Inscription réussie !',
          html: '<p>Un code de vérification a été envoyé à votre adresse email.</p>',
          confirmButtonColor: '#3a7bd5',
        }).then(() => {
          this.router.navigate(['/verifEmail'], { 
            queryParams: { email: formData.email }
          });
        });
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage = error.error?.message || 'Une erreur est survenue lors de l\'inscription';
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          html: `<p>${errorMessage}</p>${error.error?.details ? `<p>${error.error.details}</p>` : ''}`,
          confirmButtonColor: '#3a7bd5',
        });
      }
    });
  }
}