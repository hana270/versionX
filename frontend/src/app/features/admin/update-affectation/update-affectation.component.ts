import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InstallationsService } from '../../../core/services/installations.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AffectationDTO, AffectationResponseDTO } from '../../../core/models/affectation-response.dto';

@Component({
  selector: 'app-update-affectation',
  templateUrl: './update-affectation.component.html',
  styleUrl: './update-affectation.component.css'
})
export class UpdateAffectationComponent {
/*updateForm: FormGroup;
  affectationId: number;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private installationsService: InstallationsService,
    private snackBar: MatSnackBar
  ) {
    this.updateForm = this.fb.group({
      commandeId: ['', Validators.required],
      notes: [''],
      statut: ['PLANIFIEE', Validators.required],
      installateurs: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.affectationId = +this.route.snapshot.paramMap.get('id')!;
    this.loadAffectationData();
  }

  get installateurs(): FormArray {
    return this.updateForm.get('installateurs') as FormArray;
  }

  loadAffectationData(): void {
    this.loading = true;
    this.installationsService.getAffectationById(this.affectationId).subscribe({
      next: (affectation: AffectationResponseDTO) => {
        this.updateForm.patchValue({
          commandeId: affectation.commandeId,
          notes: affectation.notes,
          statut: affectation.statut
        });

        // Clear existing installateurs
        while (this.installateurs.length) {
          this.installateurs.removeAt(0);
        }

        // Add installateurs from response
        affectation.installateurs.forEach(inst => {
          this.addInstallerFormGroup(
            inst.installateurId,
            inst.installateurNom,
            inst.dateInstallation,
            inst.heureDebut,
            inst.heureFin
          );
        });

        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open('Erreur lors du chargement des données', 'Fermer', { duration: 5000 });
        this.router.navigate(['/affectations']);
      }
    });
  }

  addInstallerFormGroup(
    installateurId?: number,
    installateurNom?: string,
    dateInstallation?: string,
    heureDebut?: string,
    heureFin?: string
  ): void {
    this.installateurs.push(this.fb.group({
      installateurId: [installateurId || '', Validators.required],
      installateurNom: [installateurNom || '', Validators.required],
      dateInstallation: [dateInstallation || '', Validators.required],
      heureDebut: [heureDebut || '08:00', Validators.required],
      heureFin: [heureFin || '12:00', Validators.required]
    }));
  }

  removeInstaller(index: number): void {
    this.installateurs.removeAt(index);
  }

  addNewInstaller(): void {
    this.addInstallerFormGroup();
  }

  onSubmit(): void {
    if (this.updateForm.valid) {
      this.loading = true;
      const formValue = this.updateForm.value;

      const updateDTO: AffectationDTO = {
        commandeId: formValue.commandeId,
        notes: formValue.notes,
        installateurs: formValue.installateurs.map((inst: any) => ({
          installateurId: inst.installateurId,
          dateInstallation: inst.dateInstallation,
          heureDebut: inst.heureDebut,
          heureFin: inst.heureFin
        }))
      };

      this.installationsService.updateAffectation(this.affectationId, updateDTO)
        .subscribe({
          next: (updatedAffectation) => {
            this.loading = false;
            this.snackBar.open('Affectation mise à jour avec succès', 'Fermer', { duration: 3000 });
            this.router.navigate(['/affectations', updatedAffectation.id]);
          },
          error: (err) => {
            this.loading = false;
            this.snackBar.open('Erreur lors de la mise à jour: ' + err.message, 'Fermer', { duration: 5000 });
          }
        });
    }
  }

  updateStatus(newStatus: string): void {
    this.installationsService.updateAffectationStatus(this.affectationId, newStatus)
      .subscribe({
        next: () => {
          this.snackBar.open('Statut mis à jour avec succès', 'Fermer', { duration: 3000 });
          this.loadAffectationData(); // Recharger les données
        },
        error: (err) => {
          this.snackBar.open('Erreur: ' + err.message, 'Fermer', { duration: 5000 });
        }
      });
  }
      */
}