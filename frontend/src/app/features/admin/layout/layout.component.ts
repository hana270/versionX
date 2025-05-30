import { Component, Input, HostListener, Output, EventEmitter, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../../../core/authentication/auth.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent implements OnInit, AfterViewInit {
  @Input() pageTitle: string = '';
  @Output() searchQueryChange = new EventEmitter<string>();

  isSidebarOpen: boolean = true;
  isMobile: boolean = false;
  isSearchActive: boolean = false;
  searchQuery: string = '';

  @ViewChild('scrollContainer') scrollContainerRef!: ElementRef;
  @ViewChild('navbar') navbarRef!: ElementRef;

  constructor(private authService: AuthService, private router: Router) {
    this.checkIfMobile();
  }

  ngOnInit() {
    const savedState = localStorage.getItem('sidebarState');
    if (savedState !== null) {
      this.isSidebarOpen = savedState === 'open';
    }
    
    // Fermer automatiquement sur mobile au démarrage
    if (this.isMobile) {
      this.isSidebarOpen = false;
    }

    setTimeout(() => {
      this.adjustLayout();
    }, 200);
    this.setInitialStyles();

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        setTimeout(() => {
          const scrollContainer = document.querySelector('.scroll-container');
          if (scrollContainer) {
            scrollContainer.scrollTop = 0;
          }
        }, 100);
      }
    });
  }

  ngAfterViewInit() {
    this.setNavbarHeight();
  }

  private setNavbarHeight() {
    const navbarHeight = this.isMobile ? 56 : 64;
    document.documentElement.style.setProperty('--navbar-height', `${navbarHeight}px`);
    document.documentElement.style.setProperty('--navbar-height-mobile', `${navbarHeight}px`);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkIfMobile();
   // this.setNavbarHeight();
    //this.adjustLayout();
      this.setInitialStyles(); // Ou this.adjustLayout() selon votre code

  }

  @HostListener('window:load', ['$event'])
  onWindowLoad(event: any) {
    setTimeout(() => {
      this.setNavbarHeight();
      this.adjustLayout();
    }, 300);
  }

  checkIfMobile() {
  const wasMobile = this.isMobile;
  this.isMobile = window.innerWidth <= 992;
  
  // Si on passe de desktop à mobile, fermer le sidebar
  if (!wasMobile && this.isMobile) {
    this.isSidebarOpen = false;
    localStorage.setItem('sidebarState', 'closed');
  }
  // Si on passe de mobile à desktop, ouvrir le sidebar
  else if (wasMobile && !this.isMobile) {
    this.isSidebarOpen = true;
    localStorage.setItem('sidebarState', 'open');
  }
}

  toggleSidebar(): void {
  this.isSidebarOpen = !this.isSidebarOpen;
  localStorage.setItem('sidebarState', this.isSidebarOpen ? 'open' : 'closed');
  
  // Supprimez le setTimeout qui fermait automatiquement le sidebar
  // if (this.isMobile && this.isSidebarOpen) {
  //   setTimeout(() => {
  //     this.isSidebarOpen = false;
  //   }, 300);
  // }
}

  closeSidebarOnNavigation() {
    if (this.isMobile) {
      this.isSidebarOpen = false;
      localStorage.setItem('sidebarState', 'closed');
    }
  }

  adjustLayout() {
  setTimeout(() => {
    const navbarHeight = this.isMobile ? 56 : 64;
    document.documentElement.style.setProperty('--navbar-height', `${navbarHeight}px`);
    
    if (this.scrollContainerRef?.nativeElement) {
      const scrollContainer = this.scrollContainerRef.nativeElement;
      scrollContainer.style.height = `calc(100vh - ${navbarHeight}px)`;
    }
    
    // Force un recalcul du layout
    window.dispatchEvent(new Event('resize'));
  }, 100);
}
  toggleSearch(): void {
    this.isSearchActive = !this.isSearchActive;
    if (!this.isSearchActive) {
      this.searchQuery = '';
      this.onSearchInput();
    }
  }

  onSearchInput(): void {
    this.searchQueryChange.emit(this.searchQuery);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/admin/signin']);
  }

  private setInitialStyles(): void {
    const navbarHeight = this.isMobile ? 56 : 64;
    document.documentElement.style.setProperty('--navbar-height', `${navbarHeight}px`);
    document.documentElement.style.setProperty('--navbar-height-mobile', '56px');
    
    // Force le recalcul du layout
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }

  
}