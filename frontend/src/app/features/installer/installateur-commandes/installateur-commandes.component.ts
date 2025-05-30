import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { InstallationsService } from '../../../core/services/installations.service';
import { CommandeResponse } from '../../../core/models/commande.models';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TerminerAffectationModalComponent } from '../terminer-affectation-modal/terminer-affectation-modal.component';

@Component({
  selector: 'app-installateur-commandes',
  templateUrl: './installateur-commandes.component.html',
  styleUrls: ['./installateur-commandes.component.css']
})
export class InstallateurCommandesComponent implements OnInit {
  userId!: number;
  commandes: CommandeResponse[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  showHistory = false;
  activeCommands: CommandeResponse[] = [];
  completedCommands: CommandeResponse[] = [];
  filteredActiveCommands: CommandeResponse[] = [];
  filteredCompletedCommands: CommandeResponse[] = [];
  searchTerm = '';
  statusFilter = 'tous';

  constructor(
    private route: ActivatedRoute,
    private installationsService: InstallationsService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCommandes();
  }

 loadCommandes(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.installationsService.getCommandesByInstallateur(this.userId).subscribe({
      next: (commandes) => {
        console.log('Commandes reçues:', commandes);
        this.commandes = commandes.map(c => ({
          ...c,
          dateCreation: c.dateCreation || new Date().toISOString() // Fournir une date par défaut si null
        }));
        this.filterCommands();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.errorMessage = err.message || 'Erreur lors du chargement des commandes';
        this.isLoading = false;
      }
    });
}

  filterCommands(): void {
    this.activeCommands = this.commandes.filter(c => 
      c.statut === 'AFFECTER' || c.statut === 'INSTALLATION_EN_COURS'
    );
    this.completedCommands = this.commandes.filter(c => 
      c.statut === 'INSTALLATION_TERMINEE' || c.statut === 'TERMINEE'
    );
  }

  applyFilters(): void {
    let filteredActive = this.activeCommands;
    let filteredCompleted = this.completedCommands;

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filteredActive = filteredActive.filter(c => 
        (c.numeroCommande && c.numeroCommande.toLowerCase().includes(term)) ||
        (c.clientNom && c.clientNom.toLowerCase().includes(term)) ||
        (c.clientPrenom && c.clientPrenom.toLowerCase().includes(term)) ||
        (c.clientEmail && c.clientEmail.toLowerCase().includes(term)) ||
        (c.clientTelephone && c.clientTelephone.toLowerCase().includes(term))
      );
      
      filteredCompleted = filteredCompleted.filter(c => 
        (c.numeroCommande && c.numeroCommande.toLowerCase().includes(term)) ||
        (c.clientNom && c.clientNom.toLowerCase().includes(term)) ||
        (c.clientPrenom && c.clientPrenom.toLowerCase().includes(term)) ||
        (c.clientEmail && c.clientEmail.toLowerCase().includes(term)) ||
        (c.clientTelephone && c.clientTelephone.toLowerCase().includes(term))
      );
      
    }

    if (this.statusFilter !== 'tous') {
      filteredActive = filteredActive.filter(c => c.statut === this.statusFilter);
      filteredCompleted = filteredCompleted.filter(c => c.statut === this.statusFilter);
    }

    this.filteredActiveCommands = filteredActive;
    this.filteredCompletedCommands = filteredCompleted;
  }

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.applyFilters();
  }

  toggleHistory(show: boolean): void {
    this.showHistory = show;
  }

  getStatusBadgeClass(statut: string): string {
    if (!statut) return 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
    
    switch(statut.toUpperCase()) {
      case 'AFFECTER': 
        return 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
      case 'INSTALLATION_EN_COURS': 
        return 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800';
      case 'TERMINEE':
      case 'INSTALLATION_TERMINEE': 
        return 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800';
      case 'ANNULEE': 
        return 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
      default: 
        return 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(statut: string): string {
    if (!statut) return 'Inconnu';
    
    switch(statut.toUpperCase()) {
      case 'AFFECTER': return 'Affecté';
      case 'INSTALLATION_EN_COURS': return 'En cours';
      case 'TERMINEE': return 'Terminé';
      case 'INSTALLATION_TERMINEE': return 'Installation terminée';
      case 'ANNULEE': return 'Annulé';
      default: return statut;
    }
  }

  getClientName(commande: CommandeResponse): string {
    if (commande.clientNom && commande.clientPrenom) {
      return `${commande.clientPrenom} ${commande.clientNom}`;
    }
    return commande.clientEmail || 'N/A';
  }

 formatDate(date: any): string {
  if (!date) return 'N/A';
  
  try {
    let dateObj: Date;
    
    // Handle array format [year, month, day, hour, minute, second, nanosecond]
    if (Array.isArray(date) && date.length >= 6) {
      // Note: JavaScript months are 0-indexed (0-11), so we subtract 1 from month
      dateObj = new Date(date[0], date[1] - 1, date[2], date[3], date[4], date[5]);
    } 
    // Handle string dates
    else if (typeof date === 'string') {
      dateObj = new Date(date);
    } 
    // Handle Date objects
    else if (date instanceof Date) {
      dateObj = date;
    } 
    // Fallback for other cases
    else {
      return 'N/A';
    }

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'N/A';
    }
    
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'N/A';
  }
}

  viewDetails(commande: CommandeResponse): void {
    console.log('Détails de la commande:', commande);
    // Implémentez ici la navigation ou l'ouverture d'un modal
  }

  openTerminerModal(commande: CommandeResponse): void {
    this.isLoading = true;
    
    if (commande.affectationId) {
      this.openModalWithAffectationId(commande, commande.affectationId);
      return;
    }

    this.installationsService.getAffectationIdByCommandeId(commande.id).subscribe({
      next: (affectationId) => {
        if (affectationId) {
          this.openModalWithAffectationId(commande, affectationId);
        } else {
          this.errorMessage = "Cette commande n'a pas d'affectation associée";
          this.isLoading = false;
        }
      },
      error: (err) => {
        this.errorMessage = "Erreur lors de la récupération de l'affectation";
        this.isLoading = false;
      }
    });
  }

  private openModalWithAffectationId(commande: CommandeResponse, affectationId: number): void {
    this.isLoading = false;
    
    const modalRef = this.modalService.open(TerminerAffectationModalComponent, {
      centered: true,
      backdrop: 'static'
    });
    
    modalRef.componentInstance.affectationId = affectationId;
    modalRef.componentInstance.userId = this.userId;
    modalRef.componentInstance.commande = commande;

    modalRef.result.then((result) => {
      if (result === 'success') {
        commande.statut = 'INSTALLATION_TERMINEE';
        this.filterCommands();
        this.applyFilters();
        this.showHistory = true;
      }
    }).catch(() => {});
  }
}