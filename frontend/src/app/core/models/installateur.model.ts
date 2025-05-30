export interface Installateur {
  id: number;
  userId: number;
  nom: string;
  email: string;
  specialite: string;
  zoneIntervention: string;
  firstName: string;
  lastName: string;
  phone: string;
  disponibilite: 'DISPONIBLE' | 'INDISPONIBLE' | 'EN_CONGE';

  //
  selectedDate?: Date | null;
  heureDebut?: string;
  heureFin?: string;
}