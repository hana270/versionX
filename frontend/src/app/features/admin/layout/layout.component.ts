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
    this.isSidebarOpen = savedState !== null ? savedState === 'open' : !this.isMobile;
    
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
    this.setInitialStyles();
  }

  checkIfMobile() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 992;
    
    if (!wasMobile && this.isMobile) {
      this.isSidebarOpen = false;
      localStorage.setItem('sidebarState', 'closed');
    }
    else if (wasMobile && !this.isMobile) {
      this.isSidebarOpen = true;
      localStorage.setItem('sidebarState', 'open');
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
    localStorage.setItem('sidebarState', this.isSidebarOpen ? 'open' : 'closed');
    
    setTimeout(() => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        if (this.isSidebarOpen) {
          sidebar.classList.add('open');
          sidebar.classList.remove('collapsed');
        } else {
          sidebar.classList.remove('open');
          if (!this.isMobile) {
            sidebar.classList.add('collapsed');
          }
        }
      }
    }, 10);
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
    
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }
}