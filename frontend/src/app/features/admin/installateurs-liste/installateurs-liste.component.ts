import { Component } from '@angular/core';
import Swal from 'sweetalert2';
import { InstallationsService } from '../../../core/services/installations.service';

@Component({
  selector: 'app-installateurs-liste',
  templateUrl: './installateurs-liste.component.html',
  styleUrl: './installateurs-liste.component.css'
})
export class InstallateursListeComponent {
/* installateurs: any[] = [];
  filteredInstallateurs: any[] = [];
  isLoading = false;
  searchQuery = '';

  constructor(private installationsService: InstallationsService) {}

  ngOnInit(): void {
    this.loadInstallateurs();
  }

 loadInstallateurs(): void {
    this.isLoading = true;
    this.installationsService.getAllInstallateursWithStatus().subscribe({
      next: (data) => {
        this.installateurs = data;
        this.filteredInstallateurs = [...data];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading installers:', error);
        Swal.fire('Erreur', 'Impossible de charger les installateurs', 'error');
        this.isLoading = false;
      }
    });
  }

  onSearchChange(): void {
    this.filteredInstallateurs = this.installateurs.filter(inst =>
      inst.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      inst.email.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  toggleAffectationStatus(installateur: any): void {
    const newStatus = !installateur.isAffected;
    const action = newStatus ? 'affecter' : 'libérer';

    Swal.fire({
      title: 'Confirmer',
      text: `Voulez-vous vraiment ${action} cet installateur ?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Oui, ${action}`,
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.installationsService.updateAffectationStatus(installateur.id, newStatus).subscribe({
          next: () => {
            installateur.isAffected = newStatus;
            Swal.fire('Succès', `Installateur ${action} avec succès`, 'success');
          },
          error: (err) => {
            console.error('Error updating status:', err);
            Swal.fire('Erreur', `Échec de l'${action}`, 'error');
          }
        });
      }
    });
  }

  getStatusBadgeClass(isAffected: boolean): string {
    return isAffected ? 'badge bg-warning' : 'badge bg-success';
  }

  getStatusText(isAffected: boolean): string {
    return isAffected ? 'Affecté' : 'Disponible';
  }*/
}
