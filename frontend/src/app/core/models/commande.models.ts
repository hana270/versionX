export enum StatutCommande {
  EN_ATTENTE = 'EN_ATTENTE',
  //VALIDEE = 'VALIDEE',
  EN_PREPARATION = 'EN_PREPARATION',
  AFFECTER = 'AFFECTER',
  //EXPEDIEE = 'EXPEDIEE',
  //LIVREE = 'LIVREE',
  //ANNULEE = 'ANNULEE',
  INSTALLATION_TERMINEE = 'INSTALLATION_TERMINEE'
}

export enum ModePaiement {
  CARTE_BANCAIRE = 'CARTE_BANCAIRE'
}

export interface LigneCommande {
  id?: number;
  produitId: number;
  typeProduit: 'BASSIN_STANDARD' | 'BASSIN_PERSONNALISE';
  nomProduit: string;
  description?: string | null;
  imageUrl?: string | null;
  quantite: number;
  prixUnitaire: number;
  prixTotal: number;
  materiauSelectionne?: string | null;
  prixMateriau?: number | null;
  dimensionSelectionnee?: string | null;
  prixDimension?: number | null;
  couleurSelectionnee?: string | null;
  statutProduit: 'DISPONIBLE' | 'SUR_COMMANDE' | 'RUPTURE_STOCK';
  delaiFabrication?: string | null;
  accessoires?: AccessoireCommande[];
}

export interface Commande {
  id?: number;
  numeroCommande: string;
  clientId: number;
  emailClient: string;
  statut: StatutCommande;
  montantTotal: number;
  montantTVA: number;
  montantTotalTTC: number;
  modePaiement?: ModePaiement | null;
  paiementConfirme?: boolean | null;
  dateCreation: Date | null; // <-- autoriser null ici
  datePaiement?: Date | null;
  adresseLivraison: string;
  codePostal: string;
  ville: string;
  pays: string;
  clientNom?: string;
  clientPrenom?: string;
  clientEmail?: string;
  clientTelephone?: string;
  commentaires?: string | null;
  lignesCommande: LigneCommande[];
}


export interface PaiementRequest {
  commandeId: string;
  modePaiement: ModePaiement;
  tokenPaiement?: string;
  saveCard?: boolean;
}

/*
export interface CommandeResponse {
  success: boolean;
  commande?: CommandeDTO;
  redirectUrl?: string;

  // For direct DTO response (fall through to these properties)
  id?: number;
  numeroCommande?: string;
  clientId?: number;
}*/

/*export interface CommandeResponse {
  id: number;
  numeroCommande: string;
  clientId: number;
  clientNom?: string;
  clientPrenom?: string;
  clientEmail?: string;
  clientTelephone?: string;
  statut: string;
  dateCreation: string;
  montantTotal: number;
  montantTotalTTC: number;
  fraisLivraison?: number;
  adresseLivraison: string;
  codePostal: string;
  ville: string;
  region?: string;
  lignesCommande?: any[];
  affectationId?: number;
}*/

export interface CommandeResponse {
  id: number;
  numeroCommande: string;
  clientId: number;
  clientNom?: string;
  clientPrenom?: string;
  clientEmail?: string;
  clientTelephone?: string;
  statut: string;
  dateCreation?: string ;
  montantTotal: number;
  montantTotalTTC: number;
  fraisLivraison?: number;
  adresseLivraison: string;
  codePostal: string;
  ville: string;
  region?: string;
  lignesCommande?: any[];
  affectationId?: number;
}


export interface CommandeDTO {
  id?: number;
  numeroCommande: string;
  clientId: number;
  clientNom?: string;
  clientPrenom?: string;
  clientEmail?: string;
  clientTelephone?: string;
  statut?: string;
  dateCreation?: string;
  montantTotal?: number;
  montantTotalTTC?: number;
  fraisLivraison?: number;
  adresseLivraison?: string;
  codePostal?: string;
  ville?: string;
  region?: string;
  lignesCommande?: any[];
}

export interface AccessoireCommande {
  accessoireId: number;
  nomAccessoire: string;
  prixAccessoire: number;
  imageUrl?: string | null;
}

export interface PanierItemDTO {
  bassinId: number;
  nomBassin: string;
  description?: string | null;
  imageUrl?: string | null;
  quantity: number;
  prixUnitaire: number;
  prixTotal?: number | null;
  isCustomized: boolean;
  status: 'DISPONIBLE' | 'SUR_COMMANDE' | 'RUPTURE_STOCK';
  materiauSelectionne?: string | null;
  prixMateriau?: number | null;
  dimensionSelectionnee?: string | null;
  prixDimension?: number | null;
  couleurSelectionnee?: string | null;
  delaiFabrication?: string | null;
  prixAccessoires?: number | null;
  accessoires?: AccessoireCommande[];
}

export interface CreationCommandeRequest {
  clientId: number;
  panierId?: number | null;
  clientNom: string;
  clientPrenom: string;
  clientEmail: string;
  clientTelephone: string;
  adresseLivraison: string;
  codePostal: string;
  ville: string;
  region: string;
  modeLivraison?: string;
  commentaires?: string | null;
  items: PanierItemDTO[];
}