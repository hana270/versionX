import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification } from '../../../core/models/notification.models';
import { AuthService } from '../../../core/authentication/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  groupedNotifications: { [key: string]: Notification[] } = {};
  showPanel = false;
  unreadCount = 0;
  currentUsername: string = '';
  private subscriptions = new Subscription();

  constructor(
    public notificationService: NotificationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    const user = this.authService.getCurrentUser();
    this.currentUsername = user?.username || '';
  }

  ngOnInit(): void {
    this.notificationService.startNotificationPolling(5000);

    this.subscriptions.add(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
        this.groupNotifications();
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.add(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
        this.cdr.detectChanges();
      })
    );

    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.notificationService.stopNotificationPolling();
  }

  loadNotifications(): void {
    if (this.currentUsername) {
      this.notificationService.getUserNotifications(this.currentUsername).subscribe();
    }
  }

  togglePanel(): void {
    this.showPanel = !this.showPanel;
    if (this.showPanel && this.unreadCount > 0) {
      this.markAllAsRead();
    }
  }

  markAsRead(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
  }

  markAllAsRead(): void {
    if (this.unreadCount > 0) {
      this.notificationService.markAllAsRead().subscribe();
    }
  }

  deleteNotification(notification: Notification, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notification.id).subscribe();
  }

  clearAllNotifications(): void {
    this.notificationService.clearAllNotifications().subscribe();
  }

 // Version avec Font Awesome Pro pour un look plus professionnel
getNotificationIcon(type: string): string {
  switch (type) {
    case 'ORDER': 
      return 'clipboard-check'; // ou 'receipt' pour les commandes
    case 'PAYMENT': 
      return 'credit-card-alt'; // ou 'money-check-alt' pour les paiements
    case 'STOCK': 
      return 'boxes'; // ou 'inventory' pour le stock
    case 'INFO': 
      return 'info-circle'; // reste approprié pour les infos
    case 'SUCCESS':
      return 'check-circle'; // pour les succès
    case 'WARNING':
      return 'exclamation-triangle'; // pour les avertissements
    case 'ERROR':
      return 'times-circle'; // pour les erreurs
    case 'USER':
      return 'user-circle'; // pour les notifications utilisateur
    case 'SYSTEM':
      return 'cog'; // pour les notifications système
    default: 
      return 'bell'; // icône par défaut
  }
}

// Alternative avec des icônes encore plus spécifiques
getNotificationIconAlt(type: string): string {
  switch (type) {
    case 'ORDER': 
      return 'shopping-bag'; // sac d'achat moderne
    case 'PAYMENT': 
      return 'credit-card'; // carte de crédit classique
    case 'STOCK': 
      return 'cubes'; // cubes pour représenter l'inventaire
    case 'INFO': 
      return 'info'; // info simple et clean
    case 'SUCCESS':
      return 'check'; // check simple
    case 'WARNING':
      return 'exclamation'; // exclamation simple
    case 'ERROR':
      return 'times'; // croix simple
    case 'DELIVERY':
      return 'truck'; // pour les livraisons
    case 'PROMOTION':
      return 'tags'; // pour les promotions
    case 'REVIEW':
      return 'star'; // pour les avis
    default: 
      return 'bell';
  }
}

  originalOrder(a: { key: string }, b: { key: string }): number {
    const order = ['Aujourd\'hui', 'Hier'];
    const aIndex = order.indexOf(a.key) !== -1 ? order.indexOf(a.key) : Number.MAX_SAFE_INTEGER;
    const bIndex = order.indexOf(b.key) !== -1 ? order.indexOf(b.key) : Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) return aIndex - bIndex;
    const aDate = this.parseDate(a.key);
    const bDate = this.parseDate(b.key);
    return bDate.getTime() - aDate.getTime();
  }

  private parseDate(key: string): Date {
    if (key === 'Aujourd\'hui') return new Date();
    if (key === 'Hier') {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return date;
    }
    return new Date(key);
  }

  private groupNotifications(): void {
    const groups: { [key: string]: Notification[] } = {};
    this.notifications.forEach(notification => {
      const date = new Date(notification.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = "Aujourd'hui";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Hier";
      } else {
        groupKey = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    this.groupedNotifications = groups;
  }

  formatRelativeTime(date: string): string {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Maintenant';
    return dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}