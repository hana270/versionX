// edit-specialty-dialog.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/authentication/auth.service';
import { InstallerSpecialty, InstallerSpecialtyDisplayNames } from '../../../core/models/installer-specialty.enum';

@Component({
  selector: 'app-edit-specialty-dialog',
  templateUrl: './edit-specialty-dialog.component.html',
  styleUrls: ['./edit-specialty-dialog.component.css']
})
export class EditSpecialtyDialogComponent implements OnInit {
  specialties: { value: string; displayName: string }[] = Object.keys(InstallerSpecialty).map(key => ({
    value: key,
    displayName: InstallerSpecialtyDisplayNames[key as InstallerSpecialty]
  }));
  
  selectedSpecialty: string = '';
  isLoading: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<EditSpecialtyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Convert display name to enum value if necessary
    this.selectedSpecialty = this.data.currentSpecialty && typeof this.data.currentSpecialty === 'string'
      ? Object.keys(InstallerSpecialtyDisplayNames).find(
          key => InstallerSpecialtyDisplayNames[key as InstallerSpecialty] === this.data.currentSpecialty
        ) || this.data.currentSpecialty
      : this.data.currentSpecialty || '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (!this.selectedSpecialty) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Veuillez sélectionner une spécialité',
        confirmButtonColor: '#1976d2'
      });
      return;
    }

    this.isLoading = true;
    this.authService.updateInstallerSpecialty(
      this.data.userId,
      this.selectedSpecialty as InstallerSpecialty
    ).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Spécialité mise à jour avec succès',
          confirmButtonColor: '#1976d2'
        });
        this.isLoading = false;
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error('Error updating specialty:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Échec de la mise à jour de la spécialité',
          confirmButtonColor: '#1976d2'
        });
        this.isLoading = false;
      }
    });
  }
}