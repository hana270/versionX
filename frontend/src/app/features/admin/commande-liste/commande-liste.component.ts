import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { CommandeService } from '../../../core/services/commande.service';
import { Commande, LigneCommande, StatutCommande } from '../../../core/models/commande.models';
import { Router } from '@angular/router';
import { BassinService } from '../../../core/services/bassin.service';

@Component({
  selector: 'app-commande-liste',
  templateUrl: './commande-liste.component.html',
  styleUrl: './commande-liste.component.css'
})
export class CommandeListeComponent implements OnInit {
  commandes: Commande[] = [];
  filteredCommandes: Commande[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  // Pour filtrage et tri
  statutFilter = new FormControl('');
  searchTerm = new FormControl('');
  sortOptions = new FormControl('dateDesc');
  
  // Pour la pagination
  pageSize = 10;
  currentPage = 0;
  
  // Liste des statuts pour le filtre
  statutsList = Object.values(StatutCommande);
  
  // Pour l'expansion des détails de commande
  expandedCommande: string | null = null;
  StatutCommande = StatutCommande; 
  bassinsDetails: Map<number, any> = new Map(); 
  activeTab: string = 'preparation'; // Default active tab
  pageSizeOptions = [5, 10, 25, 100];
  public Math = Math;

  constructor(
    private commandeService: CommandeService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private bassinService: BassinService
  ) { }

  ngOnInit(): void {
    this.loadCommandes();
    
    // Réagir aux changements des filtres
    this.statutFilter.valueChanges.subscribe(() => this.applyFilters());
    this.searchTerm.valueChanges.subscribe(() => this.applyFilters());
    this.sortOptions.valueChanges.subscribe(() => this.applyFilters());
  }
  
  applyFilters(): void {
    let filtered = [...this.commandes];
    
    // Filtre par statut
    const statutValue = this.statutFilter.value;
    if (statutValue) {
      filtered = filtered.filter(cmd => cmd.statut === statutValue);
    }
    
    // Filtre par recherche (numéro commande, nom client, etc.)
    const searchValue = this.searchTerm.value?.toLowerCase();
    if (searchValue) {
      filtered = filtered.filter(cmd => 
        cmd.numeroCommande?.toLowerCase().includes(searchValue) ||
        cmd.clientNom?.toLowerCase().includes(searchValue) ||
        cmd.clientPrenom?.toLowerCase().includes(searchValue) ||
        cmd.clientEmail?.toLowerCase().includes(searchValue) ||
        cmd.ville?.toLowerCase().includes(searchValue)
      );
    }
    
    // Tri
    const sortValue = this.sortOptions.value;
    switch (sortValue) {
      case 'dateDesc':
        filtered.sort((a, b) => {
          const dateA = a.dateCreation ? new Date(a.dateCreation).getTime() : 0;
          const dateB = b.dateCreation ? new Date(b.dateCreation).getTime() : 0;
          return dateB - dateA;
        });
        break;

      case 'dateAsc':
        filtered.sort((a, b) => {
          const dateA = a.dateCreation ? new Date(a.dateCreation).getTime() : 0;
          const dateB = b.dateCreation ? new Date(b.dateCreation).getTime() : 0;
          return dateA - dateB;
        });
        break;
        
      case 'montantDesc':
        filtered.sort((a, b) => b.montantTotalTTC - a.montantTotalTTC);
        break;

      case 'montantAsc':
        filtered.sort((a, b) => a.montantTotalTTC - b.montantTotalTTC);
        break;
    }
    
    this.filteredCommandes = filtered;
  }

  setActiveTab(tab: string): void {
  this.activeTab = tab;
  this.currentPage = 0; // Reset to first page when changing tabs
}

  /**
 * Gets commandes by status - now uses filteredCommandes
 */
getCommandesByStatus(status: StatutCommande): Commande[] {
  return this.filteredCommandes.filter(cmd => cmd.statut === status);
}

/**
 * Gets commandes for the current active tab
 */
getCommandesForActiveTab(): Commande[] {
  switch (this.activeTab) {
    case 'preparation':
      return this.getCommandesByStatus(StatutCommande.EN_PREPARATION);
    case 'affecter':
      return this.getCommandesByStatus(StatutCommande.AFFECTER);
    case 'termine':
      return this.getCommandesByStatus(StatutCommande.INSTALLATION_TERMINEE);
    default:
      return this.filteredCommandes;
  }
}

  getPages(): number[] {
  const totalPages = this.getTotalPages();
  return Array.from({ length: totalPages }, (_, i) => i);
}

goToPage(page: number): void {
  if (page >= 0 && page < this.getTotalPages()) {
    this.currentPage = page;
  }
}



  /**
   * Changement de statut d'une commande
   */
  updateStatus(commande: Commande, newStatus: StatutCommande): void {
    if (!commande.id) {
      this.snackBar.open('ID de commande invalide', 'Fermer', { duration: 3000 });
      return;
    }
    
    this.commandeService.updateCommandeStatus(commande.id, newStatus).subscribe({
      next: () => {
        // Mettre à jour le statut localement
        commande.statut = newStatus;
        this.snackBar.open(`Statut de la commande ${commande.numeroCommande} mis à jour`, 'OK', { duration: 3000 });
      },
      error: (error) => {
        this.snackBar.open(`Erreur: ${error.message}`, 'Fermer', { duration: 5000 });
      }
    });
  }

  /**
   * Afficher ou masquer les détails d'une commande
   */
  toggleDetails(numeroCommande: string): void {
    this.expandedCommande = this.expandedCommande === numeroCommande ? null : numeroCommande;
  }

  /**
   * Calcule le nombre total de produits dans une commande
   */
  getTotalProduits(lignesCommande: LigneCommande[] | undefined): number {
    if (!lignesCommande || !Array.isArray(lignesCommande)) {
      return 0;
    }
    return lignesCommande.reduce((total, ligne) => total + (ligne.quantite || 0), 0);
  }

  /**
   * Pagination - page suivante
   */
  nextPage(): void {
    if ((this.currentPage + 1) * this.pageSize < this.filteredCommandes.length) {
      this.currentPage++;
    }
  }

  /**
   * Pagination - page précédente
   */
  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  /**
   * Retourne les commandes pour la page actuelle
   */
  getCurrentPageItems(): Commande[] {
  const tabCommandes = this.getCommandesForActiveTab();
  const start = this.currentPage * this.pageSize;
  const end = start + this.pageSize;
  return tabCommandes.slice(start, end);
}

  /**
   * Obtient la classe CSS appropriée pour le statut
   */
 getStatusClass(statut: StatutCommande): string {
  switch (statut) {
    case StatutCommande.EN_ATTENTE:
      return 'bg-yellow-100 text-yellow-800';
    /*case StatutCommande.VALIDEE:
      return 'bg-blue-100 text-blue-800';*/
    case StatutCommande.EN_PREPARATION:
      return 'bg-green-100 text-green-800';
    case StatutCommande.AFFECTER:
      return 'bg-indigo-100 text-indigo-800';
    /*case StatutCommande.EXPEDIEE:
      return 'bg-purple-100 text-purple-800';*/
    /*case StatutCommande.LIVREE:*/
    case StatutCommande.INSTALLATION_TERMINEE:
      return 'bg-red-100 text-red-800';
    /*case StatutCommande.ANNULEE:
      return 'bg-gray-100 text-gray-800';*/
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

  /**
   * Format de date convivial
   */
  formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
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

  /**
   * Calcule le nombre total de pages pour la pagination
   */
 getTotalPages(): number {
  const tabCommandes = this.getCommandesForActiveTab();
  return Math.ceil(tabCommandes.length / this.pageSize);
}


  
  /**
   * Retourne le nom complet du client
   */
  getClientFullName(commande: Commande): string {
    const prenom = commande.clientPrenom || '';
    const nom = commande.clientNom || '';
    return `${prenom} ${nom}`.trim() || 'N/A';
  }
  
  /**
   * Retourne l'adresse complète
   */
  getAdresseComplete(commande: Commande): string {
    const adresse = commande.adresseLivraison || '';
    const codePostal = commande.codePostal || '';
    const ville = commande.ville || '';
    
    return [adresse, codePostal, ville].filter(Boolean).join(', ') || 'N/A';
  }

 loadCommandes(): void {
    this.loading = true;
    this.commandeService.getAllCommandes().subscribe({
        next: (commandes) => {
            console.log('Commandes brutes reçues:', commandes);
            this.commandes = commandes.map(commande => ({
                ...commande,
                lignesCommande: commande.lignesCommande || []
            }));
            this.verifyCommandesData();
            this.loadBassinsDetails();
            this.applyFilters();
            this.loading = false;
        },
        error: (error) => this.handleError(error)
    });
}

  // Vérifie que les données des commandes sont correctement structurées
verifyCommandesData(): void {
    console.log('Vérification des données des commandes...');
    this.commandes.forEach(commande => {
        console.log(`Vérification commande ${commande.numeroCommande}:`, commande);

        // Ensure lignesCommande is an array
        if (!commande.lignesCommande || !Array.isArray(commande.lignesCommande)) {
            console.log(`Initialisation lignesCommande pour la commande ${commande.numeroCommande}`);
            commande.lignesCommande = [];
        }

        // Log bassin IDs for each ligne
        if (commande.lignesCommande.length > 0) {
            console.log(`La commande ${commande.numeroCommande} contient ${commande.lignesCommande.length} lignes`);
            commande.lignesCommande.forEach((ligne, index) => {
                console.log(`Ligne ${index} de la commande ${commande.numeroCommande}:`, ligne);
                if (ligne.produitId) {
                    console.log(`Bassin ID pour ligne ${index}: ${ligne.produitId}`);
                } else {
                    console.warn(`Ligne ${index}: produitId manquant`);
                }

                // Initialize accessoires if not defined
                if (!ligne.accessoires) {
                    ligne.accessoires = [];
                }
            });
        } else {
            console.warn(`La commande ${commande.numeroCommande} n'a pas de lignes de commande!`);
        }
    });
}

loadBassinsDetails(): void {
    const bassinIds = new Set<number>();

    // Collect all unique bassin IDs
    this.commandes.forEach(commande => {
        if (commande.lignesCommande && Array.isArray(commande.lignesCommande)) {
            commande.lignesCommande.forEach(ligne => {
                if (ligne?.produitId) {
                    bassinIds.add(ligne.produitId);
                }
            });
        }
    });

    console.log(`Chargement des détails pour ${bassinIds.size} bassins...`);

    // Load details for each bassin
    Array.from(bassinIds).forEach(id => {
        this.bassinService.getBassinDetails(id).subscribe({
            next: (bassin) => {
                if (bassin && bassin.idBassin) {
                    this.bassinsDetails.set(id, {
                        ...bassin,
                        imageUrl: bassin.imagesBassin?.[0]?.imagePath || 'assets/default-bassin.webp',
                        promotionActive: this.checkPromotionActive(bassin.promotion)
                    });
                    console.log(`Détails chargés pour le bassin ${id}`);
                } else {
                    console.warn(`Aucun détail trouvé pour le bassin ${id}`);
                }
            },
            error: (err) => console.error(`Erreur chargement détail bassin ${id}`, err)
        });
    });
}

  private checkPromotionActive(promotion: any): boolean {
    if (!promotion) return false;
    
    try {
      const now = new Date();
      const startDate = new Date(promotion.dateDebut);
      const endDate = new Date(promotion.dateFin);
      
      return now >= startDate && now <= endDate;
    } catch (e) {
      console.error('Erreur vérification promotion', e);
      return false;
    }
  }

  getBassinDetails(bassinId: number): any {
    return this.bassinsDetails.get(bassinId) || null;
  }

  isBassinPersonnalise(ligne: LigneCommande): boolean {
    return ligne && ligne.typeProduit === 'BASSIN_PERSONNALISE';
  }

  isBassinSurCommande(ligne: LigneCommande): boolean {
    if (!ligne) return false;
    
    const bassin = this.getBassinDetails(ligne.produitId);
    return bassin?.statut === 'SUR_COMMANDE' || ligne.statutProduit === 'SUR_COMMANDE';
  }

  getDureeFabrication(ligne: LigneCommande): string {
    if (!ligne) return 'N/A';
    
    if (ligne.delaiFabrication) return ligne.delaiFabrication;
    
    const bassin = this.getBassinDetails(ligne.produitId);
    if (bassin?.dureeFabricationDisplay) return bassin.dureeFabricationDisplay;
    
    return this.isBassinPersonnalise(ligne) ? '15 jours' : '3-5 jours';
  }

  getBassinImage(ligne: LigneCommande): string {
    if (!ligne) return 'assets/default-bassin.webp';
    
    if (ligne.imageUrl) return ligne.imageUrl;
    
    const bassin = this.getBassinDetails(ligne.produitId);
    return bassin?.imageUrl || 'assets/default-bassin.webp';
  }

  isEnPromotion(ligne: LigneCommande): boolean {
    if (!ligne) return false;
    
    const bassin = this.getBassinDetails(ligne.produitId);
    return bassin?.promotionActive || false;
  }

  getPrixOriginal(ligne: LigneCommande): number {
    if (!ligne) return 0;
    
    const bassin = this.getBassinDetails(ligne.produitId);
    return bassin?.prix || ligne.prixUnitaire || 0;
  }
  
  private handleError(error: any): void {
    console.error('Erreur:', error);
    this.error = `Une erreur est survenue: ${error.message || 'Erreur inconnue'}`;
    this.loading = false;
    this.snackBar.open(this.error, 'Fermer', { duration: 5000 });

    // Rediriger si l'utilisateur n'est pas admin
    if (error.message?.includes('Accès refusé')) {
      this.router.navigate(['/']);
    }
  }
}