import { Component } from '@angular/core';
import { Commande, StatutCommande } from '../../../core/models/commande.models';
import { ActivatedRoute } from '@angular/router';
import { CommandeService } from '../../../core/services/commande.service';

@Component({
  selector: 'app-details-commande-client',
  templateUrl: './details-commande-client.component.html',
  styleUrl: './details-commande-client.component.css'
})
export class DetailsCommandeClientComponent {
commande: Commande | null = null;
  isLoading = false;
  errorMessage: string | null = null;
    Math = Math;

  // Définition des statuts pour le suivi
  statuses = [
    {
      id: 1,
      title: "Payé",
      shortTitle: "PAY",
      description: "Transaction sécurisée",
      icon: "credit-card",
      color: "#10B981",
      lightColor: "#D1FAE5",
      position: { top: 15, left: 50 },
      angle: 0
    },
    {
      id: 2,
      title: "Préparation",
      shortTitle: "PREP",
      description: "Assemblage produit",
      icon: "package-2",
      color: "#3B82F6",
      lightColor: "#DBEAFE",
      position: { top: 40, left: 85 },
      angle: 90
    },
    {
      id: 3,
      title: "Affecté",
      shortTitle: "AFF",
      description: "Équipe mobilisée",
      icon: "wrench",
      color: "#8B5CF6",
      lightColor: "#EDE9FE",
      position: { top: 85, left: 50 },
      angle: 180
    },
    {
      id: 4,
      title: "Terminé",
      shortTitle: "FIN",
      description: "Mission accomplie",
      icon: "check-circle",
      color: "#059669",
      lightColor: "#A7F3D0",
      position: { top: 40, left: 15 },
      angle: 270
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private commandeService: CommandeService
  ) {}

  ngOnInit(): void {
    this.loadCommandeDetails();
  }

 private loadCommandeDetails(): void {
    const commandeId = this.route.snapshot.paramMap.get('commandeId');
    
    if (!commandeId) {
      this.errorMessage = 'ID de commande non spécifié.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.commandeService.getCommande(commandeId).subscribe({
      next: (commande) => {
        this.commande = commande;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.userMessage || 
          'Une erreur est survenue lors du chargement des détails de la commande.';
        console.error('Erreur chargement détails commande:', error);
      }
    });
  }

  getCirclePosition(angle: number): { x: number, y: number } {
  // Convertir l'angle en radians
  const radians = (angle - 90) * Math.PI / 180;
  // Rayon du cercle (40% pour rester dans le conteneur)
  const radius = 40;
  // Calcul des coordonnées
  const x = 50 + radius * Math.cos(radians);
  const y = 50 + radius * Math.sin(radians);
  return { x, y };
}

  getStatusLabel(statut: StatutCommande): string {
  const statusLabels: { [key in StatutCommande]: string } = {
    [StatutCommande.EN_ATTENTE]: 'En attente',
    [StatutCommande.EN_PREPARATION]: 'En préparation',
    [StatutCommande.AFFECTER]: 'Affectée',
    [StatutCommande.INSTALLATION_TERMINEE]: 'Installation terminée'
  };
  
  return statusLabels[statut] || statut;
}

getImageUrl(item: any): string {
  // Si l'item a une imageUrl directe
  if (item.imageUrl) {
    return this.getCompleteImageUrl(item.imageUrl);
  }
  
  // Pour les bassins standard
  if (item.typeProduit === 'BASSIN_STANDARD' && item.produitId) {
    return `/api/images/bassin/${item.produitId}`; // Adaptez selon votre API
  }
  
  // Pour les bassins personnalisés
  if (item.typeProduit === 'BASSIN_PERSONNALISE' && item.materiauSelectionne) {
    return this.getMateriauImage(item.materiauSelectionne);
  }
  
  return ''; // Retourne une chaîne vide si aucune image n'est trouvée
}

getCompleteImageUrl(imagePath: string): string {
  // Si c'est déjà une URL complète
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Si c'est un chemin relatif
  return `/assets/images/${imagePath}`; // Adaptez selon votre structure
}

getMateriauImage(materiau: string): string {
  const materiauxImages: {[key: string]: string} = {
    'Béton': 'assets/img/materiaux/beton.jpg',
    'PEHD': 'assets/img/materiaux/pehd.jpg',
    // Ajoutez d'autres matériaux selon vos besoins
  };
  
  return materiauxImages[materiau] || '';
}

onImageError(event: any): void {
  event.target.style.display = 'none'; // Cache l'image si elle ne charge pas
}

getStatusClass(statut: StatutCommande): string {
  const statusClasses: { [key in StatutCommande]: string } = {
    [StatutCommande.EN_ATTENTE]: 'badge-warning',
    [StatutCommande.EN_PREPARATION]: 'badge-info',
    [StatutCommande.AFFECTER]: 'badge-secondary',
    [StatutCommande.INSTALLATION_TERMINEE]: 'badge-success'
  };
  
  return statusClasses[statut] || 'badge-secondary';
}

 getStatusIndex(statut: StatutCommande): number {
  const statusOrder = [
    StatutCommande.EN_ATTENTE,          // 0% (étape 1)
    StatutCommande.EN_PREPARATION,      // 33% (étape 2)
    StatutCommande.AFFECTER,            // 66% (étape 3)
    StatutCommande.INSTALLATION_TERMINEE // 100% (étape 4)
  ];
  
  const index = statusOrder.indexOf(statut);
  return index >= 0 ? index : 0;
}

getCompletionPercentage(statut: StatutCommande): number {
  const statusWeights = {
    [StatutCommande.EN_ATTENTE]: 0,
    [StatutCommande.EN_PREPARATION]: 0.33,
    [StatutCommande.AFFECTER]: 0.66,
    [StatutCommande.INSTALLATION_TERMINEE]: 1
  };
  return statusWeights[statut] || 0;
}
  formatDate(date: Date | null): string {
    if (!date) return 'Date inconnue';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
}
