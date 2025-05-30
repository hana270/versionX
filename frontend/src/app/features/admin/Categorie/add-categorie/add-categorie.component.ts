import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Categorie } from '../../../../core/models/categorie.models';
import { CategorieService } from '../../../../core/services/categorie.service';
import Swal from 'sweetalert2';
import { AuthService } from '../../../../core/authentication/auth.service';

@Component({
  selector: 'app-add-categorie',
  templateUrl: './add-categorie.component.html',
  styleUrls: ['./add-categorie.component.css'],
})
export class AddCategorieComponent implements OnInit {
  newCategorie: Categorie = new Categorie();
  formSubmitted = false;

  constructor(private categorieService: CategorieService, private router: Router
    ,private authService:AuthService
  ) {}

  ngOnInit(): void {}

  // Ajouter une catégorie
  /*addCategorie(): void {
    this.categorieService.addCategorie(this.newCategorie).subscribe(
      () => {
        Swal.fire('Succès !', 'La catégorie a été ajoutée.', 'success');
        this.router.navigate(['/admin/list-categories']);
      },
      (error) => {
        Swal.fire('Erreur !', 'Une erreur est survenue lors de l\'ajout.', 'error');
      }
    );
  }*/
    addCategorie(): void {
      this.formSubmitted = true;
  
      if (!this.isFormValid()) {
        return;
      }
  
      this.categorieService.addCategorie(this.newCategorie).subscribe({
        next: () => {
          Swal.fire({
            title: 'Succès',
            text: 'La catégorie a été ajoutée avec succès',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          }).then(() => {
            this.router.navigate(['/admin/list-categories']);
          });
        },
        error: (error) => {
          let errorMessage = 'Une erreur est survenue lors de l\'ajout';
          
          if (error.error && error.error.message && 
              error.error.message.includes('existe déjà')) {
            errorMessage = 'Une catégorie avec ce nom existe déjà';
          } else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }
          
          Swal.fire({
            title: 'Erreur',
            text: errorMessage,
            icon: 'error'
          });
        }
      });
    }
  
    isFormValid(): boolean {
      // Vérification du nom (minimum 3 caractères)
      if (!this.newCategorie.nomCategorie || 
          this.newCategorie.nomCategorie.trim().length < 3) {
        Swal.fire('Erreur', 'Le nom de la catégorie doit contenir au moins 3 caractères', 'error');
        return false;
      }
  
      // Vérification de la description
      if (!this.newCategorie.description || 
          this.newCategorie.description.trim() === '') {
        Swal.fire('Erreur', 'La description est obligatoire', 'error');
        return false;
      }
  
      return true;
    }
  

  annuler(): void {
    this.router.navigate(['/admin/list-categories']); // Rediriger vers la page de connexion admin
  }

  logout(): void {
    this.authService.logout(); // Appeler la méthode de déconnexion du service
    this.router.navigate(['/admin/signin']); // Rediriger vers la page de connexion admin
  }
}