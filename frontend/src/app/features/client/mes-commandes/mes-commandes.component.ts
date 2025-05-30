import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CommandeService } from '../../../core/services/commande.service';
import { Commande, StatutCommande } from '../../../core/models/commande.models';

@Component({
  selector: 'app-mes-commandes',
  templateUrl: './mes-commandes.component.html',
  styleUrls: ['./mes-commandes.component.css']
})
export class MesCommandesComponent implements OnInit {
  commandes: Commande[] = [];
  filteredCommandes: Commande[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  clientId: number | null = null;
  selectedStatus = 'tous';
  searchTerm = '';

  constructor(
    private commandeService: CommandeService,
    private authStateService: AuthStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadClientIdAndCommandes();
  }

  private loadClientIdAndCommandes(): void {
    const currentUser = this.authStateService.getCurrentUser();
    if (currentUser && currentUser.user_id) {
      this.clientId = currentUser.user_id;
      this.loadCommandes();
    } else {
      this.errorMessage = 'Utilisateur non authentifié. Veuillez vous connecter.';
      this.router.navigate(['/login']);
    }
  }

  public loadCommandes(): void {
    if (!this.clientId) {
      this.errorMessage = 'Identifiant client non disponible.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.commandeService.getCommandesClient(this.clientId).subscribe({
      next: (commandes) => {
        this.commandes = commandes;
        this.filterCommandes();
        this.isLoading = false;
        
        if (commandes.length === 0) {
          this.errorMessage = 'Vous n\'avez pas encore de commandes.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.userMessage || 'Une erreur est survenue lors du chargement des commandes.';
        console.error('Erreur chargement commandes:', error);
      }
    });
  }

  filterCommandes(): void {
    this.filteredCommandes = this.commandes.filter(commande => {
      // Filter by status
      const statusMatches = this.selectedStatus === 'tous' || commande.statut.toString() === this.selectedStatus;
      
      // Filter by search term (checks in order number or address)
      const searchTermLower = this.searchTerm.toLowerCase();
      const searchMatches = !this.searchTerm || 
        commande.numeroCommande.toLowerCase().includes(searchTermLower) ||
        commande.adresseLivraison.toLowerCase().includes(searchTermLower) ||
        commande.ville.toLowerCase().includes(searchTermLower) ||
        commande.codePostal.toLowerCase().includes(searchTermLower);
      
      return statusMatches && searchMatches;
    });
  }

  resetFilters(): void {
    this.selectedStatus = 'tous';
    this.searchTerm = '';
    this.filterCommandes();
  }

  sortCommandes(criteria: string): void {
    this.filteredCommandes = [...this.filteredCommandes].sort((a, b) => {
      switch (criteria) {
        /*case 'date':
          if (!a.dateCreation || !b.dateCreation) return 0;
return new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime();*/
        case 'amount':
          return b.montantTotalTTC - a.montantTotalTTC;
        case 'status':
          return a.statut.localeCompare(b.statut);
        default:
          return 0;
      }
    });
  }

  getStatusLabel(statut: StatutCommande): string {
    const statusLabels: { [key in StatutCommande]: string } = {
      [StatutCommande.EN_ATTENTE]: 'En attente',
      [StatutCommande.EN_PREPARATION]: 'En préparation',
      [StatutCommande.AFFECTER]: 'Affectée',
      [StatutCommande.INSTALLATION_TERMINEE]: 'Terminée'
    };
    return statusLabels[statut] || statut;
  }

  getStatusColorClass(statut: StatutCommande): string {
    const statusColors: { [key in StatutCommande]: string } = {
      [StatutCommande.EN_ATTENTE]: 'bg-yellow-100 text-yellow-700',
      [StatutCommande.EN_PREPARATION]: 'bg-blue-100 text-blue-700',
      [StatutCommande.AFFECTER]: 'bg-purple-100 text-purple-700',
      [StatutCommande.INSTALLATION_TERMINEE]: 'bg-green-100 text-green-700'
    };
    return statusColors[statut] || 'bg-gray-100 text-gray-700';
  }

  getProgressPercentage(statut: StatutCommande): number {
  const statusProgress = {
    [StatutCommande.EN_ATTENTE]: 25,
    [StatutCommande.EN_PREPARATION]: 50,
    [StatutCommande.AFFECTER]: 75,
    [StatutCommande.INSTALLATION_TERMINEE]: 100
  };
  return statusProgress[statut] || 0;
}

  getPriority(commande: Commande): string {
    // Déterminez la priorité en fonction du montant ou d'autres critères
    if (commande.montantTotalTTC > 2000) return 'high';
    if (commande.montantTotalTTC > 1000) return 'medium';
    return 'low';
  }

  getCompletedCount(): number {
    return this.commandes.filter(c => c.statut === StatutCommande.INSTALLATION_TERMINEE).length;
  }

  getInProgressCount(): number {
    return this.commandes.filter(c => 
      c.statut === StatutCommande.EN_PREPARATION || 
      c.statut === StatutCommande.AFFECTER
    ).length;
  }

  getTotalAmount(): number {
    return this.commandes.reduce((total, c) => total + c.montantTotalTTC, 0);
  }

  /*getEstimatedDelivery(commande: Commande): string {
  if (!commande.dateCreation) return 'Date non disponible';
  
  try {
    const date = new Date(commande.dateCreation);
    date.setDate(date.getDate() + 7); // Exemple: 7 jours après la commande
    return date.toLocaleDateString('fr-FR');
  } catch (e) {
    console.error('Invalid date format', e);
    return 'Date non disponible';
  }
}*/

/*formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Date non disponible';
  
  try {
    // Si c'est déjà un Date, utilisez-le directement
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    return parsedDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error('Format de date invalide', e);
    return 'Date non disponible';
  }
}*/
  viewCommandeDetails(commandeId: number | undefined): void {
    if (!commandeId) {
      console.error('ID de commande non valide');
      return;
    }
    this.router.navigate(['/client/detail-commande', commandeId.toString()]);
  }
}