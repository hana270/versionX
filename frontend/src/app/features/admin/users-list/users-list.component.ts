import { AfterViewInit, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/authentication/auth.service';
import Swal from 'sweetalert2';
import { EditSpecialtyDialogComponent } from '../edit-specialty-dialog/edit-specialty-dialog.component';
import { InstallerSpecialty } from '../../../core/models/installer-specialty.enum';
import { animate, style, transition, trigger } from '@angular/animations';
import { Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

declare var $: any; // Declare jQuery for TypeScript

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('500ms ease-in', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class UsersListComponent implements OnInit {
  // Data arrays
  clients: any[] = [];
  installers: any[] = [];
  filteredClients: any[] = [];
  filteredInstallers: any[] = [];
  
  // Loading and search
  isLoading: boolean = true;
  searchQuery: string = '';
  
  // Tab management
  activeTab: string = 'clients';
  
  // Pagination
  pageSize: number = 10;
  currentClientPage: number = 1;
  currentInstallerPage: number = 1;
  
  // Sorting
  clientSortColumn: string = '';
  clientSortDirection: 'asc' | 'desc' = 'asc';
  installerSortColumn: string = '';
  installerSortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

 

  private initializeDataTables(): void {
    if ($ && $.fn && $.fn.dataTable) {
      // Clients table
      $('#clientsTable').DataTable({
        pageLength: this.pageSize,
        searching: false, // Use custom search
        ordering: false,  // Use custom sorting
        language: {
          url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json'
        }
      });

      // Installers table
      $('#installersTable').DataTable({
        pageLength: this.pageSize,
        searching: false, // Use custom search
        ordering: false,  // Use custom sorting
        language: {
          url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/fr-FR.json'
        }
      });
    } else {
      console.error('jQuery or DataTables not properly loaded');
    }
  }

 loadUsers(): void {
    this.isLoading = true;
    
    // Load clients
    this.authService.getAllClients().subscribe({
      next: (data) => {
        this.clients = data.map(user => ({
          ...user,
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
          profileImage: this.getProfileImageUrl(user.profileImage)
        }));
        this.filteredClients = [...this.clients];
        this.applyGlobalFilter();
      },
      error: (error) => {
        console.error('Error fetching clients:', error);
        this.showErrorAlert('Échec du chargement des clients. Veuillez réessayer.');
      }
    });

    // Load installers
    this.authService.getInstallers().subscribe({
      next: (data) => {
        this.installers = data.map(installer => ({
          ...installer,
          fullName: `${installer.firstName || ''} ${installer.lastName || ''}`.trim() || installer.username,
          profileImage: this.getProfileImageUrl(installer.profileImage),
          specialty: installer.specialty || 'NON_SPECIFIED'
        }));
        this.filteredInstallers = [...this.installers];
        this.applyGlobalFilter();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching installers:', error);
        this.showErrorAlert('Échec du chargement des installateurs. Veuillez réessayer.');
        this.isLoading = false;
      }
    });
  }

getProfileImageUrl(profileImage: string | null): string {
    if (!profileImage) {
        return 'assets/images/default-image-profile.webp';
    }
    
    if (profileImage.startsWith('http') || profileImage.startsWith('assets/')) {
        return profileImage;
    }
    
    return `${this.authService.apiURL}/photos_profile/${profileImage}`;
}

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.resetPagination();
  }

  private resetPagination(): void {
    this.currentClientPage = 1;
    this.currentInstallerPage = 1;
  }

  applyGlobalFilter(): void {
    const filterValue = this.searchQuery.trim().toLowerCase();
    
    this.filteredClients = this.clients.filter(client =>
      client.fullName.toLowerCase().includes(filterValue) ||
      client.username.toLowerCase().includes(filterValue) ||
      client.email.toLowerCase().includes(filterValue)
    );
    
    this.filteredInstallers = this.installers.filter(installer =>
      installer.fullName.toLowerCase().includes(filterValue) ||
      installer.username.toLowerCase().includes(filterValue) ||
      installer.email?.toLowerCase().includes(filterValue) ||
      this.getSpecialtyDisplayName(installer.specialty).toLowerCase().includes(filterValue)
    );
    
    this.resetPagination();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyGlobalFilter();
  }

  sortClients(column: string): void {
    if (this.clientSortColumn === column) {
      this.clientSortDirection = this.clientSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.clientSortColumn = column;
      this.clientSortDirection = 'asc';
    }
    
    this.filteredClients.sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return this.clientSortDirection === 'asc' ? comparison : -comparison;
    });
    
    this.currentClientPage = 1;
  }

  sortInstallers(column: string): void {
    if (this.installerSortColumn === column) {
      this.installerSortDirection = this.installerSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.installerSortColumn = column;
      this.installerSortDirection = 'asc';
    }
    
    this.filteredInstallers.sort((a, b) => {
      let aValue, bValue;
      
      if (column === 'specialty') {
        aValue = this.getSpecialtyDisplayName(a[column]);
        bValue = this.getSpecialtyDisplayName(b[column]);
      } else {
        aValue = a[column];
        bValue = b[column];
      }
      
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return this.installerSortDirection === 'asc' ? comparison : -comparison;
    });
    
    this.currentInstallerPage = 1;
  }

  get paginatedClients(): any[] {
    const start = (this.currentClientPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredClients.slice(start, end);
  }

  get paginatedInstallers(): any[] {
    const start = (this.currentInstallerPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredInstallers.slice(start, end);
  }

  getTotalPages(type: string): number {
    const totalItems = type === 'clients' ? this.filteredClients.length : this.filteredInstallers.length;
    return Math.ceil(totalItems / this.pageSize);
  }

  goToPage(type: string, page: number): void {
    if (type === 'clients') {
      this.currentClientPage = page;
    } else {
      this.currentInstallerPage = page;
    }
  }

  getCurrentPageStart(type: string): number {
    const currentPage = type === 'clients' ? this.currentClientPage : this.currentInstallerPage;
    return (currentPage - 1) * this.pageSize + 1;
  }

  getCurrentPageEnd(type: string): number {
    const currentPage = type === 'clients' ? this.currentClientPage : this.currentInstallerPage;
    const totalItems = type === 'clients' ? this.filteredClients.length : this.filteredInstallers.length;
    return Math.min(currentPage * this.pageSize, totalItems);
  }

  getSpecialtyDisplayName(specialty: string): string {
    const specialtyMap: { [key: string]: string } = {
      'PLUMBER_OUTDOOR': 'Technicien en plomberie extérieure',
      'ELECTRICIAN_LANDSCAPE': 'Électricien paysager – Éclairage extérieur',
      'LANDSCAPER_POOL_DECORATOR': 'Paysagiste décorateur de bassins',
      'WALL_POOL_INSTALLER': 'Installateur de bassins muraux',
      'AQUARIUM_TECHNICIAN': 'Technicien en aquariophilie et bassins vivants',
      'MASON_POOL_STRUCTURES': 'Maçon spécialisé en structures de bassins'
    };
    
    return specialtyMap[specialty] || 'Spécialité non spécifiée';
  }

  openEditSpecialtyDialog(installer: any): void {
    const dialogRef = this.dialog.open(EditSpecialtyDialogComponent, {
      width: '1200px',
      panelClass: ['specialty-dialog', 'professional-dialog'],
      data: {
        userId: installer.user_id,
        currentSpecialty: installer.specialty,
        username: installer.fullName || installer.username
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadUsers();
        this.showSuccessAlert('Spécialité mise à jour avec succès.');
      }
    });
  }

  toggleUserStatus(user: any): void {
    if (!user.user_id) {
      console.error('User ID is undefined');
      return;
    }

    const action = user.enabled ? 'désactiver' : 'activer';
    const actionText = user.enabled ? 'Désactiver' : 'Activer';
    const successMessage = user.enabled 
      ? 'Le compte a été désactivé avec succès.' 
      : 'Le compte a été activé avec succès.';
    
    Swal.fire({
      title: 'Confirmation',
      text: `Voulez-vous vraiment ${action} le compte de ${user.fullName || user.username}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: user.enabled ? '#000000' : '#000000',
      cancelButtonColor: '#666666',
      confirmButtonText: `Oui, ${actionText}`,
      cancelButtonText: 'Annuler',
      background: '#ffffff',
      color: '#000000',
      customClass: {
        popup: 'swal-black-white',
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const serviceCall = user.enabled 
          ? this.authService.deactivateUser(user.user_id) 
          : this.authService.activateUser(user.user_id);
        
        serviceCall.subscribe({
          next: () => {
            this.showSuccessAlert(successMessage);
            this.loadUsers();
          },
          error: (error) => {
            console.error(`Error ${action} user:`, error);
            this.showErrorAlert(`Échec de l'opération ${action}.`);
          }
        });
      }
    });
  }

  trackByUserId(index: number, user: any): any {
    return user.user_id;
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/default-image-profile.webp';
  }

  private showSuccessAlert(message: string): void {
    Swal.fire({
      icon: 'success',
      title: 'Succès',
      text: message,
      confirmButtonColor: '#000000',
      background: '#ffffff',
      color: '#000000',
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: 'swal-black-white',
        confirmButton: 'swal-confirm-btn'
      }
    });
  }

  private showErrorAlert(message: string): void {
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: message,
      confirmButtonText: 'OK',
      confirmButtonColor: '#000000',
      background: '#ffffff',
      color: '#000000',
      customClass: {
        popup: 'swal-black-white',
        confirmButton: 'swal-confirm-btn'
      }
    });
  }
}