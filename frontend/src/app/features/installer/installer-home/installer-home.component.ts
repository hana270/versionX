import { Component, OnDestroy, OnInit } from '@angular/core';

interface Specialty {
  icon: string;
  name: string;
  description: string;
  features: string[];
}

@Component({
  selector: 'app-installer-home',
  templateUrl: './installer-home.component.html',
  styleUrls: ['./installer-home.component.css']
})
export class InstallerHomeComponent implements OnInit, OnDestroy {
  specialties: Specialty[] = [
    {
      icon: 'pool',
      name: 'Installation de Piscines',
      description: 'Conception et installation de piscines sur mesure, de la piscine familiale au bassin de luxe.',
      features: [
        'Piscines enterrées et hors-sol',
        'Systèmes de filtration avancés',
        'Éclairage LED et automatisation',
        'Garantie 10 ans structure'
      ]
    },
    {
      icon: 'water_drop',
      name: 'Aquariums Professionnels',
      description: 'Création d\'aquariums sur mesure pour particuliers et professionnels.',
      features: [
        'Aquariums eau douce et marine',
        'Systèmes de filtration biologiques',
        'Éclairage LED spécialisé',
        'Maintenance et suivi'
      ]
    },
    {
      icon: 'plumbing',
      name: 'Plomberie Aquatique',
      description: 'Installation et réparation de tous systèmes de plomberie liés à l\'eau.',
      features: [
        'Canalisations étanches',
        'Systèmes de drainage',
        'Pompes et filtres',
        'Dépannage 24h/24'
      ]
    },
    {
      icon: 'electrical_services',
      name: 'Électricité Spécialisée',
      description: 'Installation électrique sécurisée pour tous projets aquatiques.',
      features: [
        'Éclairage submersible',
        'Tableaux électriques étanches',
        'Automatisation complète',
        'Normes de sécurité IP68'
      ]
    }
  ];

  private observer: IntersectionObserver | undefined;

  constructor() { }

  ngOnInit(): void {
    this.initAnimations();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  trackByFn(index: number, item: Specialty): string {
    return item.name;
  }

  trackByFeature(index: number, item: string): string {
    return item;
  }

  callInstaller(): void {
    alert('📞 Appel en cours...\n\nVous allez être redirigé vers l\'application téléphone pour appeler Marc Dubois au 06 12 34 56 78');
  }

  messageInstaller(): void {
    alert('💬 Ouverture de la messagerie...\n\nVous pouvez maintenant envoyer un message direct à Marc Dubois pour discuter de votre projet !');
  }

  private initAnimations(): void {
    const options = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.opacity = '1';
          (entry.target as HTMLElement).style.transform = 'translateY(0)';
          this.observer?.unobserve(entry.target);
        }
      });
    }, options);

    // Wait for the view to be initialized
    setTimeout(() => {
      const elements = document.querySelectorAll('.specialty-card, .portfolio-item, .testimonial-card');
      elements.forEach(el => {
        this.observer?.observe(el);
      });
    });
  }
}