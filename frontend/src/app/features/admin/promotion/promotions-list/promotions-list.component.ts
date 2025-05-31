import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Promotion } from '../../../../core/models/promotion.model';
import { PromotionService } from '../../../../core/services/promotion.service';
import { DatePipe } from '@angular/common';
import Swal from 'sweetalert2';
import { NotificationService } from '../../../../core/services/notification.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-promotions-list',
  templateUrl: './promotions-list.component.html',
  styleUrls: ['./promotions-list.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('rotateIcon', [
      transition(':enter', [
        style({ transform: 'rotate(0deg)' }),
        animate('200ms ease-out', style({ transform: 'rotate(180deg)' }))
      ])
    ])
  ]
})
export class PromotionsListComponent implements OnInit {
  promotions: Promotion[] = [];
  filteredPromotions: Promotion[] = [];
  loading: boolean = true;
  error: string | null = null;
  searchTerm: string = '';
  currentDate: string = '';
  showExpired: boolean = false;
  stockAlert: boolean = false;
  activeFilter: string | null = null;

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

   constructor(
    private promotionService: PromotionService,
    private router: Router,
    private datePipe: DatePipe,
    private cdRef: ChangeDetectorRef,
    private notificationService: NotificationService
  ) {
    this.notificationService.promotionUpdate$.subscribe(() => {
      this.loadPromotions();
    });
  }


  ngOnInit(): void {
    this.loadPromotions();
  }

  loadPromotions(): void {
    this.loading = true;
    this.promotionService.getAllPromotions().subscribe({
      next: (data) => {
        this.promotions = data || [];
        this.filteredPromotions = [...this.promotions];
        this.currentDate = this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm') || '';
        this.updatePagination();
        this.loading = false;
        this.cdRef.detectChanges();
      },
      error: (err) => {
        console.error('Error loading promotions', err);
        this.promotions = [];
        this.filteredPromotions = [];
        this.error = 'Failed to load promotions';
        this.loading = false;
      }
    });
  }

  applySearch(): void {
    if (!this.searchTerm) {
      this.filteredPromotions = [...this.promotions];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredPromotions = this.promotions.filter(p => 
        p.nomPromotion?.toLowerCase().includes(term) || 
        (p.tauxReduction * 100).toString().includes(term) ||
        (p.bassins && p.bassins.some(b => b.nomBassin?.toLowerCase().includes(term))) ||
        (p.categories && p.categories.some(c => c.nomCategorie?.toLowerCase().includes(term)))
      );
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  filterByStatus(status: string): void {
    this.activeFilter = this.activeFilter === status ? null : status;
    this.currentPage = 1;
    this.updatePagination();
  }

  shouldShowSection(status: string): boolean {
    if (!this.activeFilter) return true;
    return this.activeFilter === status;
  }

  toggleExpired(): void {
    this.showExpired = !this.showExpired;
  }

  getPromotionStatus(promotion: Promotion): string {
    const now = new Date();
    const start = new Date(promotion.dateDebut);
    const end = new Date(promotion.dateFin);

    if (end < now) return 'expired';
    if (start > now) return 'upcoming';
    return 'active';
  }

  getPromotionsByStatus(status: string): Promotion[] {
    return this.filteredPromotions.filter(p => this.getPromotionStatus(p) === status);
  }

  getPromotionProgress(promotion: Promotion): number {
    const now = new Date().getTime();
    const start = new Date(promotion.dateDebut).getTime();
    const end = new Date(promotion.dateFin).getTime();
    
    if (now >= end) return 100;
    if (now <= start) return 0;
    
    return ((now - start) / (end - start)) * 100;
  }

  getDaysUntilStart(dateString: string): number {
    const startDate = new Date(dateString);
    const now = new Date();
    const diffTime = startDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysSinceEnd(dateString: string): number {
    const endDate = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - endDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredPromotions.length / this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  deletePromotion(id: number): void {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      text: 'Vous ne pourrez pas annuler cette action !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3f51b5',
      cancelButtonColor: '#e5383b',
      confirmButtonText: 'Oui, supprimer !',
      cancelButtonText: 'Annuler',
    }).then((result) => {
      if (result.isConfirmed) {
        this.promotionService.deletePromotion(id).subscribe({
          next: () => {
            this.promotions = this.promotions.filter(p => p.idPromotion !== id);
            this.filteredPromotions = this.filteredPromotions.filter(p => p.idPromotion !== id);
            this.updatePagination();
            this.showSuccessToast('Promotion supprimée avec succès !');
          },
          error: (err) => {
            console.error('Erreur lors de la suppression', err);
            this.showErrorToast('Erreur lors de la suppression de la promotion.');
          }
        });
      }
    });
  }

  reactivatePromotion(id: number): void {
    Swal.fire({
      title: 'Réactiver la promotion',
      text: 'Voulez-vous vraiment réactiver cette promotion ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2b9348',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, réactiver !',
      cancelButtonText: 'Annuler',
    }).then((result) => {
      if (result.isConfirmed) {
        const promotionToUpdate = this.promotions.find(p => p.idPromotion === id);
        if (promotionToUpdate) {
          const today = new Date();
          const newEndDate = new Date(today);
          newEndDate.setDate(today.getDate() + 30);
          
          promotionToUpdate.dateDebut = today.toISOString().split('T')[0];
          promotionToUpdate.dateFin = newEndDate.toISOString().split('T')[0];
          
          this.promotionService.updatePromotion(id, promotionToUpdate).subscribe({
            next: () => {
              this.loadPromotions();
              this.showSuccessToast('Promotion réactivée avec succès !');
            },
            error: (err) => {
              console.error('Erreur lors de la réactivation de la promotion', err);
              this.showErrorToast('Erreur lors de la réactivation de la promotion.');
            }
          });
        }
      }
    });
  }

  private showSuccessToast(message: string): void {
    Swal.fire({
      icon: 'success',
      title: 'Succès !',
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  }

  private showErrorToast(message: string): void {
    Swal.fire({
      icon: 'error',
      title: 'Erreur !',
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  }
}