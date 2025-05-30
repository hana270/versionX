import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Commande, StatutCommande } from '../../../core/models/commande.models';
import { CommandeService } from '../../../core/services/commande.service';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
// Correction des imports avec types
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';

// Ajout des déclarations de types pour éviter les erreurs TS
declare module 'jspdf';
declare module 'html2canvas';

@Component({
  selector: 'app-commande-confirmation',
  templateUrl: './commande-confirmation.component.html',
  styleUrls: ['./commande-confirmation.component.scss']
})
export class CommandeConfirmationComponent implements OnInit {
  commande: Commande | null = null;
  loading = true;
  error = '';
  numeroCommande: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private commandeService: CommandeService,
    private cartService: CartService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    // Get order number from route parameter
 this.route.paramMap.subscribe(params => {
    const id = params.get('id'); // Assurez-vous que la route utilise :id
    if (id) {
        this.loadOrderDetails(id);
        // Vider le panier
        this.cartService.clearCart().subscribe({
            next: () => console.log('Cart cleared successfully'),
            error: (err) => console.error('Error clearing cart:', err)
        });
    } else {
        this.error = 'ID de commande non trouvé dans les paramètres de route';
        this.loading = false;
        this.toastService.showError(this.error);
    }
});
  }

 loadOrderDetails(id: string): void {
    this.loading = true;
    this.error = '';

    console.log(`Loading order details for ID: ${id}`);

    this.commandeService.getCommande(id).subscribe({
        next: (commande) => {
            this.commande = commande;
            this.numeroCommande = commande.numeroCommande; // Mise à jour du numéro pour le PDF
            this.loading = false;

            // Vérifier si le statut de la commande est valide
            if (commande.statut !== StatutCommande.EN_PREPARATION ) {
                console.warn(`Order status may be unexpected: ${commande.statut}. Expected: VALIDEE or EN_PREPARATION`);
                this.toastService.showWarning(`Statut de la commande: ${commande.statut}. En attente de confirmation finale.`);
            }
        },
        error: (err) => {
            console.error('Error loading order details:', err);
            this.loading = false;

            if (err.errorCode === 'ORDER_NOT_FOUND' || err.status === 404) {
                this.error = `La commande avec l'ID "${id}" n'a pas été trouvée. Veuillez vérifier l'identifiant.`;
            } else if (err.errorCode === 'NETWORK_ERROR' || err.status === 0) {
                this.error = `Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.`;
            } else {
                this.error = `Erreur lors du chargement de la commande: ${err.userMessage || err.message || 'Erreur inconnue'}`;
            }
            this.toastService.showError(this.error);
        }
    });
}

  downloadPDF(): void {
    const element = document.querySelector('.success-container') as HTMLElement;
    if (!element) {
      Swal.fire({
        title: 'Erreur',
        text: 'Impossible de générer le PDF. Contenu de la page non trouvé.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }

    Swal.fire({
      title: 'Génération du PDF',
      text: 'Veuillez patienter...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    html2canvas(element, { scale: 2 }).then((canvas: HTMLCanvasElement) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`confirmation-commande-${this.numeroCommande}.pdf`);
      Swal.close();
      this.toastService.showSuccess('PDF téléchargé avec succès');
    }).catch((err: Error) => {
      console.error('Erreur lors de la génération du PDF:', err);
      Swal.close();
      Swal.fire({
        title: 'Erreur',
        text: 'Une erreur est survenue lors de la génération du PDF.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    });
  }

  retourAccueil(): void {
    this.router.navigate(['/']);
  }

  viewOrders(): void {
    this.router.navigate(['/mon-compte/mes-commandes']);
  }

  retryLoading(): void {
    if (this.numeroCommande) {
      this.loadOrderDetails(this.numeroCommande);
    }
  }
}