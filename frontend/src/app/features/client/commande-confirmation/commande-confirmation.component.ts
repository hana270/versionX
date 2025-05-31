import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Commande, StatutCommande, LigneCommande } from '../../../core/models/commande.models';
import { CommandeService } from '../../../core/services/commande.service';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-commande-confirmation',
  templateUrl: './commande-confirmation.component.html',
  styleUrls: ['./commande-confirmation.component.scss'],
  providers: [DecimalPipe]
})
export class CommandeConfirmationComponent implements OnInit {
  commande: Commande | null = null;
  loading = true;
  error = '';
  numeroCommande: string = '';
  private baseImageUrl = 'http://localhost:8087/api/aquatresor/api/imagesBassin/getFS/';

  private standardProductImages: { [key: string]: string } = {
    "Recervoir d'eau": 'assets/images/recervoir-eau.webp',
    'Récupérateur d\'eau rond': 'assets/images/recuperateur-rond.webp'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private commandeService: CommandeService,
    private cartService: CartService,
    private decimalPipe: DecimalPipe
  ) { }

 ngOnInit(): void {
  this.route.paramMap.subscribe(params => {
    const id = params.get('id');
    if (id) {
      this.numeroCommande = id;
      this.loadOrderDetails(id); // Load order details first
    } else {
      this.error = 'Numéro de commande non fourni dans l\'URL.';
      this.loading = false;
    //  this.toastService.showError(this.error);
   //   this.router.navigate(['/cart']); // Redirect only if ID is missing
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
      this.numeroCommande = commande.numeroCommande;
      this.loading = false;

      // Clear cart only after successfully loading the order
      this.cartService.clearCart().subscribe({
        next: () => console.log('Panier vidé avec succès'),
        error: (err) => console.error('Erreur lors du vidage du panier:', err)
      });

      if (commande.statut !== StatutCommande.EN_PREPARATION) {
        console.warn(`Order status may be unexpected: ${commande.statut}. Expected: VALIDEE or EN_PREPARATION`);
      //  this.toastService.showWarning(`Statut de la commande: ${commande.statut}. En attente de confirmation finale.`);
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
    //  this.toastService.showError(this.error);
      // Navigate to cart only if there's an error
  //    this.router.navigate(['/cart']);
    }
  });
}

  getItemFullName(ligne: LigneCommande): string {
    if (!ligne) return 'Produit';
    
    if (ligne.typeProduit === 'BASSIN_PERSONNALISE') {
      return ligne.nomProduit ? `${ligne.nomProduit} (Personnalisé)` : 'Bassin personnalisé';
    }
    return ligne.nomProduit || 'Bassin';
  }

  getItemImageUrl(ligne: LigneCommande): string {
    if (!ligne) return 'assets/default-bassin.webp';

    if (ligne.typeProduit === 'BASSIN_PERSONNALISE' && ligne.imageUrl) {
      return ligne.imageUrl.startsWith('http') 
        ? ligne.imageUrl 
        : `${this.baseImageUrl}${ligne.imageUrl}`;
    }

    if (ligne.typeProduit !== 'BASSIN_PERSONNALISE') {
      if (ligne.imageUrl) {
        return ligne.imageUrl.startsWith('http') 
          ? ligne.imageUrl 
          : `${this.baseImageUrl}${ligne.imageUrl}`;
      }
      if (ligne.nomProduit && this.standardProductImages[ligne.nomProduit]) {
        return this.standardProductImages[ligne.nomProduit];
      }
    }

    return 'assets/default-bassin.webp';
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/default-bassin.webp';
    console.warn('Image failed to load, falling back to default image');
  }

  formatPrice(value: number): string {
    if (value == null) return '0,000 TND';
    const formatted = value.toFixed(3).replace('.', ',');
    return `${formatted} TND`;
  }

  formatStatut(statut: string): string {
    return statut.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  downloadPDF(): void {
  const element = document.querySelector('.success-container') as HTMLElement;
  if (!element) {
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: 'Impossible de générer le PDF. Contenu introuvable.',
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

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const maxContentHeight = pdfHeight - 2 * margin - 20; // Account for header/footer
  let currentY = margin;

  // Add header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Confirmation de Commande', pdfWidth / 2, currentY, { align: 'center' });
  currentY += 10;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Commande ${this.numeroCommande} - ${new Date().toLocaleDateString('fr-FR')}`, margin, currentY);
  currentY += 10;

  // Temporarily style the element for PDF
  const originalStyles = { ...element.style };
  element.style.padding = '10mm';
  element.style.background = '#fff';
  element.style.width = `${pdfWidth - 2 * margin}mm`;
  element.style.boxSizing = 'border-box';
  element.style.overflow = 'visible'; // Ensure all content is visible

  // Ensure the element is fully rendered
  window.scrollTo(0, 0); // Reset scroll position

  // Capture the entire content
  html2canvas(element, { 
    scale: 2, 
    useCORS: true
  }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * (pdfWidth - 2 * margin)) / imgProps.width;
    
    // Handle multi-page PDF
    let remainingHeight = imgHeight;
    let canvasY = 0;

    while (remainingHeight > 0) {
      const pageHeight = Math.min(remainingHeight, maxContentHeight);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = (pageHeight * canvas.width) / (pdfWidth - 2 * margin);
      
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, canvasY, canvas.width, tempCanvas.height, 0, 0, canvas.width, tempCanvas.height);
      }

      const tempImgData = tempCanvas.toDataURL('image/png');
      pdf.addImage(tempImgData, 'PNG', margin, currentY, pdfWidth - 2 * margin, pageHeight);

      remainingHeight -= pageHeight;
      canvasY += tempCanvas.height;

      if (remainingHeight > 0) {
        pdf.addPage();
        currentY = margin;
        // Add header on new page
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text('Confirmation de Commande', pdfWidth / 2, currentY, { align: 'center' });
        currentY += 10;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Commande ${this.numeroCommande} - ${new Date().toLocaleDateString('fr-FR')}`, margin, currentY);
        currentY += 10;
      }
    }

    // Add footer
    pdf.setFontSize(8);
    pdf.text('© 2024 Acqua Trésor. Tous droits réservés.', pdfWidth / 2, pdfHeight - 10, { align: 'center' });

    // Save PDF
    pdf.save(`confirmation-commande-${this.numeroCommande}.pdf`);

    // Restore original styles
    Object.assign(element.style, originalStyles);

    Swal.close();
  //  this.toastService.showSuccess('PDF téléchargé avec succès.');
  }).catch(err => {
    console.error('Erreur génération PDF:', err);
    Object.assign(element.style, originalStyles);
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: 'Échec de la génération du PDF. Réessayez plus tard.',
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