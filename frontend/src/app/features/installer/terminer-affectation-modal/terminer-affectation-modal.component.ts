import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { InstallationsService } from '../../../core/services/installations.service';

@Component({
  selector: 'app-terminer-affectation-modal',
  templateUrl: './terminer-affectation-modal.component.html',
  styleUrls: ['./terminer-affectation-modal.component.css']
})
export class TerminerAffectationModalComponent implements OnInit {
  @Input() commande: any;
  @Input() affectationId!: number; 
  @Input() userId!: number;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  alreadyCompleted = false;
  isLastInstaller = false;
  
  get shouldDisableButton(): boolean {
    return this.isLoading || this.alreadyCompleted || 
           (!this.isLastInstaller && !this.alreadyCompleted);
  }

  constructor(
    public activeModal: NgbActiveModal,
    private installationsService: InstallationsService
  ) {}

  ngOnInit(): void {
    this.checkInstallationStatus();
  }

  checkInstallationStatus(): void {
    this.installationsService.getInstallationStatus(this.affectationId, this.userId)
      .subscribe({
        next: (response) => {
          this.alreadyCompleted = response.alreadyCompleted;
          this.isLastInstaller = response.isLastInstaller;
        },
        error: (err) => {
          console.error('Erreur lors de la vérification du statut', err);
          this.errorMessage = 'Impossible de vérifier le statut de l\'installation';
        }
      });
  }

  confirmTerminer(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.installationsService.terminerAffectation(this.affectationId, this.userId)
      .subscribe({
        next: (response) => {
          this.successMessage = 'Installation marquée comme terminée';
          this.alreadyCompleted = true;
          this.isLoading = false;
          
          if (this.isLastInstaller) {
            setTimeout(() => this.activeModal.close('success'), 1500);
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la finalisation';
          this.isLoading = false;
        }
      });
  }
}