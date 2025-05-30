import { ChangeDetectorRef, Component } from '@angular/core';
import { OrdersService } from '../../../core/services/orders.service';
import { AuthService } from '../../../core/authentication/auth.service';
import { forkJoin, map, Observable } from 'rxjs';
import { InstallationsService } from '../../../core/services/installations.service';
import { InstallerSpecialty, InstallerSpecialtyDisplayNames } from '../../../core/models/installer-specialty.enum';
import { ActivatedRoute, Router } from '@angular/router';

interface SpecialtyOption {
  value: InstallerSpecialty | '';
  displayName: string;
  icon: string;
  selected: boolean; // Ajoutez cette ligne
}

@Component({
  selector: 'app-affectation-dialog',
  templateUrl: './affectation-dialog.component.html',
  styleUrls: ['./affectation-dialog.component.css']
})
export class AffectationDialogComponent {
  currentStep = 1;
  commande: any;
  commandeDetails: any;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  selectedSpecialties: InstallerSpecialty[] = [];
  specialtyInstallersMap: {[specialty: string]: any[]} = {};
  selectedInstallersBySpecialty: {[specialty: string]: any[]} = {};
  selectedInstallers: any[] = [];
  //selectedDate: Date | null = null;
  minDate: Date;
  heureDebut: string = '08:00';
  heureFin: string = '12:00'; // Changé à 12:00 pour correspondre à la fin de matinée

  specialties: SpecialtyOption[] = [
  { 
    value: '', 
    displayName: 'Toutes les spécialités', 
    icon: 'handyman', 
    selected: false 
  },
  { 
    value: InstallerSpecialty.PLUMBER_OUTDOOR, 
    displayName: InstallerSpecialtyDisplayNames[InstallerSpecialty.PLUMBER_OUTDOOR], 
    icon: 'plumbing',
    selected: false 
  },
  { 
    value: InstallerSpecialty.ELECTRICIAN_LANDSCAPE, 
    displayName: InstallerSpecialtyDisplayNames[InstallerSpecialty.ELECTRICIAN_LANDSCAPE], 
    icon: 'electrical_services',
    selected: false 
  },
  { 
    value: InstallerSpecialty.LANDSCAPER_POOL_DECORATOR, 
    displayName: InstallerSpecialtyDisplayNames[InstallerSpecialty.LANDSCAPER_POOL_DECORATOR], 
    icon: 'water',
    selected: false 
  },
  { 
    value: InstallerSpecialty.WALL_POOL_INSTALLER, 
    displayName: InstallerSpecialtyDisplayNames[InstallerSpecialty.WALL_POOL_INSTALLER], 
    icon: 'wallpaper',
    selected: false 
  },
  { 
    value: InstallerSpecialty.AQUARIUM_TECHNICIAN, 
    displayName: InstallerSpecialtyDisplayNames[InstallerSpecialty.AQUARIUM_TECHNICIAN], 
    icon: 'water_drop',
    selected: false 
  },
  { 
    value: InstallerSpecialty.MASON_POOL_STRUCTURES, 
    displayName: InstallerSpecialtyDisplayNames[InstallerSpecialty.MASON_POOL_STRUCTURES], 
    icon: 'construction',
    selected: false 
  }
];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ordersService: OrdersService,
    private installationsService: InstallationsService,
    private cdr: ChangeDetectorRef
  ) {
    this.minDate = new Date();
    this.minDate.setHours(0, 0, 0, 0);
  }

   ngOnInit(): void {
    const commandeId = this.route.snapshot.paramMap.get('id');
    if (commandeId) {
      this.loadCommande(commandeId);
      this.loadCommandeDetails(commandeId);
      this.loadInstallateurs();
    }

    const navigation = this.router.getCurrentNavigation();
    this.successMessage = navigation?.extras?.state?.['successMessage'];
  }

  loadCommande(commandeId: string): void {
    this.isLoading = true;
    this.ordersService.getCommandeById(commandeId).subscribe({
      next: (commande) => {
        this.commande = commande;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.errorMessage = 'Impossible de charger la commande';
        this.isLoading = false;
      }
    });
  }

  loadCommandeDetails(commandeId: string): void {
    this.ordersService.getCommandeById(commandeId).subscribe({
      next: (details) => {
        this.commandeDetails = details;
      },
      error: (err) => {
        console.error('Erreur:', err);
      }
    });
  }

  loadInstallateurs(): void {
    this.isLoading = true;
    this.installationsService.getInstallateurs().subscribe({
      next: (installateurs) => {
        this.specialtyInstallersMap = {};
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.errorMessage = 'Impossible de charger les installateurs';
        this.isLoading = false;
      }
    });
  }

  onSpecialtyChange(specialty: SpecialtyOption): void {
  if (specialty.value === '') {
    // Si "Toutes les spécialités" est sélectionné, désélectionner toutes les autres
    if (specialty.selected) {
      this.specialties.forEach(s => {
        if (s.value !== '') s.selected = false;
      });
    }
    this.selectedSpecialties = specialty.selected ? [] : [];
  } else {
    // Désélectionner "Toutes les spécialités" si une spécialité spécifique est sélectionnée
    const allSpecialties = this.specialties.find(s => s.value === '');
    if (allSpecialties) allSpecialties.selected = false;
    
    this.selectedSpecialties = this.specialties
      .filter(s => s.selected && s.value !== '')
      .map(s => s.value as InstallerSpecialty);
  }
  
  this.filterInstallersBySpecialties();
}

  onInstallerSelectionChange(): void {
    this.updateSelectedInstallersList();
    this.cdr.detectChanges();
  }

  getSpecialtyIcon(specialtyValue: InstallerSpecialty | ''): string {
    if (!specialtyValue) return 'handyman';
    const specialtyOption = this.specialties.find(s => s.value === specialtyValue);
    return specialtyOption?.icon || 'handyman';
  }

   isDisabled(): boolean {
  if (this.isLoading) {
    return true;
  }

  if (this.currentStep === 1) {
    if (this.selectedInstallers.length === 0) {
      return true;
    }

    // Vérifie que tous les installateurs ont une date et un créneau valide
    return this.selectedInstallers.some(inst => 
      !inst.selectedDate || 
      !this.isValidTimeSlot(inst.heureDebut, inst.heureFin)
    );
  }
  return false;
}


  isValidTimeSlot(start: string, end: string): boolean {
  if (!start || !end) return false;

  const startTime = this.parseTime(start);
  const endTime = this.parseTime(end);
  
  // Vérifie que les heures sont dans les plages autorisées
  const isMorningSlot = (
    startTime >= this.parseTime('08:00') && 
    endTime <= this.parseTime('12:00')
  );
  
  const isAfternoonSlot = (
    startTime >= this.parseTime('14:00') && 
    endTime <= this.parseTime('18:00')
  );
  
  // Vérifie que le créneau ne chevauche pas la pause déjeuner
  const noLunchOverlap = !(
    startTime < this.parseTime('14:00') && 
    endTime > this.parseTime('12:00')
  );
  
  // Vérifie que l'heure de début est avant l'heure de fin
  const validDuration = startTime < endTime;
  
  // Vérifie que le créneau a une durée minimale (par exemple 1 heure)
  const minDuration = 60; // 60 minutes
  const meetsMinDuration = (endTime - startTime) >= minDuration;
  
  return (isMorningSlot || isAfternoonSlot) && 
         noLunchOverlap && 
         validDuration && 
         meetsMinDuration;
}

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

 /* shouldShowError(installateur: any): boolean {
  return installateur.dateTouched && 
         installateur.startTimeTouched && 
         installateur.endTimeTouched;
}*/

  removeInstaller(specialty: InstallerSpecialty, installer: any): void {
    if (!this.selectedInstallersBySpecialty[specialty]) return;
    
    this.selectedInstallersBySpecialty[specialty] = 
      this.selectedInstallersBySpecialty[specialty].filter(
        i => i.userId !== installer.userId
      );
    
    this.updateSelectedInstallersList();
  }

  updateSelectedInstallersList(): void {
    this.selectedInstallers = [];
    for (const specialty of this.selectedSpecialties) {
      const installers = this.selectedInstallersBySpecialty[specialty] || [];
      installers.forEach(inst => {
        if (!inst.specialite) {
          inst.specialite = specialty;
        }
      });
      this.selectedInstallers.push(...installers);
    }
  }

  trackByInstallerId(index: number, installer: any): number {
    return installer.userId;
  }

  nextStep(): void {
  if (this.currentStep === 1) {
    this.updateSelectedInstallersList();
    
    // Vérifie que tous les installateurs ont une date et un créneau valide
    for (const inst of this.selectedInstallers) {
      if (!inst.selectedDate) {
        this.errorMessage = `Veuillez sélectionner une date pour ${inst.nom}`;
        return;
      }
      
      if (!this.isValidTimeSlot(inst.heureDebut, inst.heureFin)) {
        this.errorMessage = `Créneau invalide pour ${inst.nom}`;
        return;
      }
    }

    if (this.selectedInstallers.length > 0) {
      this.currentStep = 2;
    }
  } else {
    this.affecter();
  }
}

  filterInstallersBySpecialties(): void {
  this.isLoading = true;
  this.errorMessage = null;
  
  if (this.selectedSpecialties.length === 0) {
    this.isLoading = false;
    return;
  }

  this.specialtyInstallersMap = {};
  this.selectedInstallersBySpecialty = {};
  this.selectedInstallers = [];

  const specialtyRequests = this.selectedSpecialties.map(specialty => 
    this.installationsService.getInstallateursBySpecialty(specialty).pipe(
      map(installateurs => ({ specialty, installateurs }))
    ) // Ajout de la parenthèse manquante ici
  );

  forkJoin(specialtyRequests).subscribe({
    next: (results) => {
      results.forEach(result => {
        const installateursAvecSpecialite = result.installateurs.map(inst => ({
  ...inst,
  specialtyDisplay: this.getSpecialtyDisplayName(inst.specialite),
  username: inst.nom,
  userId: inst.userId,
  specialite: result.specialty,
  selectedDate: null,
  heureDebut: '08:00',
  heureFin: '12:00',
  dateTouched: false,       // Conserve pour le suivi du champ date
  timeTouched: false,       // Remplace startTimeTouched et endTimeTouched
  showError: false,         // Nouvelle propriété pour contrôler l'affichage des erreurs
  errorMessage: null,
  isAvailable: true
}));
        
        this.specialtyInstallersMap[result.specialty] = installateursAvecSpecialite;
        this.selectedInstallersBySpecialty[result.specialty] = [];
      });
      
      this.isLoading = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Erreur:', err);
      this.errorMessage = 'Erreur lors du filtrage par spécialités';
      this.isLoading = false;
    }
  });
}

onInstallerTimeChange(installateur: any): void {
  // Marque les champs comme touchés
  installateur.startTimeTouched = true;
  installateur.endTimeTouched = true;

  // Validation basique
  if (this.parseTime(installateur.heureDebut) >= this.parseTime('12:00') && 
      this.parseTime(installateur.heureDebut) < this.parseTime('14:00')) {
    installateur.heureDebut = '14:00';
  }

  if (this.parseTime(installateur.heureFin) <= this.parseTime(installateur.heureDebut)) {
    installateur.heureFin = this.parseTime(installateur.heureDebut) < this.parseTime('12:00') 
      ? '12:00' : '18:00';
  }

  // Lance la validation complète si les 3 champs sont remplis
  if (installateur.selectedDate && installateur.heureDebut && installateur.heureFin) {
    this.validateInstallerSchedule(installateur);
  }
}

  getSpecialtyDisplayName(specialtyValue: string): string {
    if (!specialtyValue) return 'Non spécifiée';
    const specialty = this.specialties.find(s => s.value === specialtyValue);
    return specialty ? specialty.displayName : specialtyValue;
  }

 validateTimes(): boolean {
  if (!this.heureDebut || !this.heureFin) {
    this.errorMessage = 'Veuillez sélectionner une heure de début et de fin';
    return false;
  }

  const start = this.parseTime(this.heureDebut);
  const end = this.parseTime(this.heureFin);

  // Vérification des plages horaires valides
  const isMorningSlot = (start >= this.parseTime('08:00')) && (end <= this.parseTime('12:00'));
  const isAfternoonSlot = (start >= this.parseTime('14:00')) && (end <= this.parseTime('18:00'));
  const noLunchOverlap = !((start < this.parseTime('14:00')) && (end > this.parseTime('12:00')));

  if (!(isMorningSlot || isAfternoonSlot) || !noLunchOverlap || start >= end) {
    this.errorMessage = 'Les créneaux valides sont: 8h-12h (matin) ou 14h-18h (après-midi)';
    return false;
  }

  return true;
}

// Ajoutez cette méthode dans votre classe
/*checkInstallerAvailability(installateur: any): void {
  if (!installateur.selectedDate || !installateur.heureDebut || !installateur.heureFin) return;

  this.installationsService.checkAvailability({
    installateurId: installateur.userId,
    dateInstallation: installateur.selectedDate.toISOString().split('T')[0],
    heureDebut: installateur.heureDebut,
    heureFin: installateur.heureFin
  }).subscribe({
    next: (isAvailable) => {
      installateur.isAvailable = isAvailable;
      installateur.errorMessage = isAvailable ? null : 'Non disponible à ce créneau';
    },
    error: (err) => {
      console.error('Erreur vérification disponibilité', err);
      installateur.errorMessage = 'Erreur de vérification';
    }
  });
}*/

 affecter(): void {
  this.isLoading = true;
  this.errorMessage = null;
  
  const installateursData = this.selectedInstallers.map(inst => ({
    installateurId: inst.userId,
    dateInstallation: inst.selectedDate.toISOString().split('T')[0],
    heureDebut: inst.heureDebut,
    heureFin: inst.heureFin
  }));

  const affectationData = {
    commandeId: this.commande.id,
    installateurs: installateursData,
    notes: 'Installation programmée'
  };

  this.installationsService.createAffectation(this.commande.id, affectationData).subscribe({
    next: () => {
      this.router.navigate(['/commandes'], {
        state: { successMessage: 'Affectation réussie' }
      });
    },
    error: (err) => {
      console.error('Erreur:', err);
      
      // Gestion spécifique des erreurs de disponibilité
      if (err.error && typeof err.error === 'string' && err.error.includes("n'est pas disponible")) {
        this.errorMessage = err.error;
        
        // Surligner l'installateur concerné dans l'interface
        const unavailableInstallerName = err.error.split("L'installateur ")[1]?.split(" ")[0];
        if (unavailableInstallerName) {
          this.selectedInstallers.forEach(inst => {
            inst.hasError = inst.nom === unavailableInstallerName;
          });
        }
      } else {
        this.errorMessage = err.message || 'Erreur lors de l\'affectation';
      }
      
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  });
}

 /*onTimeChange(): void {
  // Si l'heure de début est après 12h, basculer automatiquement sur l'après-midi
  if (this.parseTime(this.heureDebut) >= this.parseTime('12:00') && 
      this.parseTime(this.heureDebut) < this.parseTime('14:00')) {
    this.heureDebut = '14:00';
  }
  
  // Ajuster l'heure de fin si elle est invalide
  if (this.parseTime(this.heureFin) <= this.parseTime(this.heureDebut)) {
    const defaultEnd = this.parseTime(this.heureDebut) < this.parseTime('12:00') 
      ? '12:00' 
      : '18:00';
    this.heureFin = defaultEnd;
  }
  
  // Forcer la validation
  this.validateTimes();
}*/
 // Dans votre composant AffectationDialogComponent

onDateChange(installateur: any): void {
  // Formatte la date pour la base de données
  if (installateur.selectedDate) {
    installateur.selectedDateFormatted = this.formatDateForDB(installateur.selectedDate);
    this.validateInstallerSchedule(installateur);
  }
}

formatDateForDB(date: Date): string {
  // Convertit la date au format 'YYYY-MM-DD' pour la base de données
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
/*
validateInstallerSchedule(installateur: any): void {
  // Réinitialise le message d'erreur
  installateur.errorMessage = null;

  // Ne valide que si les 3 champs sont remplis
  if (installateur.selectedDate && installateur.heureDebut && installateur.heureFin) {
    // Validation basique du format et des plages horaires
    if (!this.isValidTimeSlot(installateur.heureDebut, installateur.heureFin)) {
      installateur.errorMessage = 'Créneau horaire invalide (8h-12h ou 14h-18h)';
      return;
    }

    // Vérification de la disponibilité
    this.checkInstallerAvailability(installateur);
  }
}*/

// Modifiez la méthode checkInstallerAvailability pour utiliser la date formatée
checkInstallerAvailability(installateur: any): void {
  if (!installateur.selectedDate || !installateur.heureDebut || !installateur.heureFin) {
    return;
  }

  this.installationsService.checkAvailability({
    installateurId: installateur.userId,
    dateInstallation: this.formatDateForDB(installateur.selectedDate),
    heureDebut: installateur.heureDebut,
    heureFin: installateur.heureFin
  }).subscribe({
    next: (response) => {
      installateur.isAvailable = response.available;
      installateur.errorMessage = response.available ? null : response.message;
    },
    error: (err) => {
      console.error('Erreur vérification disponibilité', err);
      installateur.errorMessage = 'Erreur de vérification';
    }
  });
}

onDateInput(installateur: any): void {
  // Marque la date comme touchée dès qu'on commence à taper
  installateur.dateTouched = true;
  this.validateInstallerSchedule(installateur);
}

onTimeInput(installateur: any): void {
  // Marque les heures comme touchées dès qu'on commence à taper
  installateur.startTimeTouched = true;
  installateur.endTimeTouched = true;
  this.validateInstallerSchedule(installateur);
}

shouldShowError(installateur: any): boolean {
  // Affiche l'erreur si au moins un champ est touché ET tous les champs requis sont remplis
  const hasTouched = installateur.dateTouched || installateur.startTimeTouched || installateur.endTimeTouched;
  const allFieldsFilled = installateur.selectedDate && installateur.heureDebut && installateur.heureFin;
  
  return hasTouched && allFieldsFilled;
}
/************************ */
// Nouvelle méthode pour gérer le blur sur la date
handleDateBlur(installateur: any): void {
  installateur.dateTouched = true;
  this.checkAndShowErrors(installateur);
}

// Nouvelle méthode pour gérer le blur sur les heures
handleTimeBlur(installateur: any): void {
  installateur.timeTouched = true;
  this.checkAndShowErrors(installateur);
}

// Méthode pour vérifier et afficher les erreurs
checkAndShowErrors(installateur: any): void {
  const allFieldsFilled = installateur.selectedDate && 
                         installateur.heureDebut && 
                         installateur.heureFin;
  
  if (allFieldsFilled) {
    installateur.showError = true;
    this.validateInstallerSchedule(installateur);
  } else {
    installateur.showError = false;
    installateur.errorMessage = null;
  }
}

// Modifiez la méthode de validation
validateInstallerSchedule(installateur: any): void {
  installateur.errorMessage = null;

  if (!this.isValidTimeSlot(installateur.heureDebut, installateur.heureFin)) {
    installateur.errorMessage = 'Créneau horaire invalide (8h-12h ou 14h-18h)';
    return;
  }

  this.checkInstallerAvailability(installateur);
}

// Modifiez onTimeChange pour une validation plus réactive
onTimeChange(installateur: any): void {
  if (installateur.selectedDate && installateur.heureDebut && installateur.heureFin) {
    this.validateInstallerSchedule(installateur);
  }
}
}