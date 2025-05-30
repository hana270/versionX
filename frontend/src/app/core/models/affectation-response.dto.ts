export interface AffectationResponseDTO {
  id: number;
  commandeId: number;
  statut: string;
  notes?: string;
  installateurs: InstallateurCreneauResponseDTO[];
}

export interface InstallateurCreneauResponseDTO {
  installateurId: number;
  installateurNom: string;
  dateInstallation: string; // ou Date si vous préférez
  heureDebut: string;
  heureFin: string;
}

// Interface pour la création/mise à jour
export interface AffectationDTO {
  commandeId: number;
  installateurs: InstallateurCreneauDTO[];
  notes?: string;
}

export interface InstallateurCreneauDTO {
  installateurId: number;
  dateInstallation: string;
  heureDebut: string;
  heureFin: string;
}