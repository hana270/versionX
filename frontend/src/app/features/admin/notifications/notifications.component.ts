import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { NotificationService } from '../../../core/services/notification.service';
import { AppNotification } from '../../../core/models/notification.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/authentication/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px) scale(0.95)' }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0) scale(1)' })
        )
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 0, transform: 'translateY(-20px) scale(0.95)' })
        )
      ])
    ]),
    trigger('pulse', [
      transition(':enter', [
        animate('2000ms', style({ transform: 'scale(1)' }))
      ])
    ]),
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-30px)', height: 0 }),
          stagger('100ms', [
            animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', 
              style({ opacity: 1, transform: 'translateX(0)', height: '*' })
            )
          ])
        ], { optional: true })
      ])
    ]),
    trigger('notificationItem', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px)' }),
        animate('500ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', 
          style({ opacity: 0, transform: 'translateX(30px) scale(0.9)' })
        )
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('toastAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  toasts: any[] = [];
  showPanel = false;
  unreadCount = 0;
  isLoading = false;
  currentUsername: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    console.log('🚀 NotificationsComponent initializing...');
  }

  ngOnInit(): void {
    console.log('🔧 Setting up NotificationsComponent');
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((user: User | null) => {
      console.log('👤 Current user changed:', user?.username);
      this.currentUsername = user?.username || null;
      if (this.currentUsername) {
        console.log('✅ User detected, initializing notifications for:', this.currentUsername);
        this.initNotifications();
      } else {
        console.warn('⚠️ No user detected, waiting for user data...');
        this.notificationService.showWarning('Utilisateur non détecté, veuillez vous connecter.');
      }
    });

    this.notificationService.toasts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(toasts => {
        console.log('🍞 Toasts updated:', toasts);
        this.toasts = toasts;
      });

    this.notificationService.connection$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        console.log('🔗 Connection status changed:', connected);
        if (!connected && this.currentUsername) {
          console.log('🔄 Connection lost, attempting to reconnect...');
          setTimeout(() => {
            this.notificationService.reconnect(this.currentUsername!);
          }, 2000);
        }
      });
  }

  private initNotifications(): void {
    if (!this.currentUsername) {
      console.warn('⚠️ Cannot initialize notifications: no username');
      this.notificationService.showError('Initialisation des notifications impossible: utilisateur non défini');
      return;
    }
    
    console.log('🔧 Initializing notifications for:', this.currentUsername);
    
    this.notificationService.initConnection(this.currentUsername);
    this.loadInitialNotifications();
    this.subscribeToNotifications();
    this.loadUnreadCount();
  }

  private loadInitialNotifications(): void {
    if (!this.currentUsername) {
      console.warn('⚠️ No username for loading notifications');
      return;
    }
    
    console.log('📥 Loading initial notifications for:', this.currentUsername);
    this.isLoading = true;
    
    this.notificationService.getUserNotifications(this.currentUsername)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.isLoading = false;
          console.log('✅ Initial notifications loaded successfully:', notifications);
          
          notifications.forEach((notification, index) => {
            console.log(`📨 Notification ${index + 1}:`, {
              id: notification.id,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              date: notification.date,
              read: notification.read,
              username: notification.username
            });
          });
          
          this.notifications = this.sortNotifications(notifications);
          this.updateUnreadCount();
          this.notificationService.showSuccess('Notifications chargées avec succès');
        },
        error: (error) => {
          this.isLoading = false;
          console.error('❌ Error loading initial notifications:', error);
          this.notificationService.showError('Erreur lors du chargement des notifications');
        }
      });
  }

  private loadUnreadCount(): void {
    if (!this.currentUsername) {
      console.warn('⚠️ No username for loading unread count');
      return;
    }
    
    this.notificationService.getUnreadCount(this.currentUsername)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          console.log('📊 Unread count loaded:', count);
          this.unreadCount = count;
        },
        error: (error) => {
          console.error('❌ Error loading unread count:', error);
          this.notificationService.showError('Erreur lors du comptage des notifications non lues');
        }
      });
  }

  private subscribeToNotifications(): void {
    console.log('🔔 Subscribing to notification streams...');
    
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        console.log('📨 Notifications stream updated:', notifications);
        this.notifications = this.sortNotifications(notifications);
        this.updateUnreadCount();
      });

    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log('📊 Unread count stream updated:', count);
        this.unreadCount = count;
      });
  }

  private sortNotifications(notifications: AppNotification[]): AppNotification[] {
    console.log('🔄 Sorting notifications');
    return notifications.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
  }

  togglePanel(): void {
    console.log('🔄 Toggling notification panel:', !this.showPanel);
    this.showPanel = !this.showPanel;
    
    if (this.showPanel && this.unreadCount > 0) {
      setTimeout(() => {
        this.markRecentAsRead();
      }, 1000);
    }
  }

  private markRecentAsRead(): void {
    const unreadNotifications = this.notifications
      .filter(n => !n.read)
      .slice(0, 3);
    
    console.log('✅ Marking recent notifications as read:', unreadNotifications.map(n => n.id));
    
    unreadNotifications.forEach(notification => {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => console.log('✅ Notification marked as read:', notification.id),
        error: (error) => {
          console.error('❌ Error marking notification as read:', error);
          this.notificationService.showError('Erreur lors du marquage de la notification');
        }
      });
    });
  }

  markAsRead(notification: AppNotification): void {
    if (!notification.read) {
      console.log('✅ Marking single notification as read:', notification.id);
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => console.log('✅ Single notification marked as read:', notification.id),
        error: (error) => {
          console.error('❌ Error marking single notification as read:', error);
          this.notificationService.showError('Erreur lors du marquage de la notification');
        }
      });
    }
  }

  markAllAsRead(): void {
    if (this.unreadCount > 0) {
      console.log('✅ Marking all notifications as read');
      this.notificationService.markAllAsRead().subscribe({
        next: () => {
          console.log('✅ All notifications marked as read');
          this.notificationService.showSuccess('Toutes les notifications ont été marquées comme lues');
        },
        error: (error) => {
          console.error('❌ Error marking all notifications as read:', error);
          this.notificationService.showError('Erreur lors du marquage des notifications');
        }
      });
    }
  }

  deleteNotification(notification: AppNotification, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    
    console.log('🗑️ Deleting notification:', notification.id);
    
    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        console.log('✅ Notification deleted successfully:', notification.id);
        this.updateUnreadCount();
        this.notificationService.showSuccess('Notification supprimée');
      },
      error: (error) => {
        console.error('❌ Error deleting notification:', error);
        this.notificationService.showError('Erreur lors de la suppression de la notification');
      }
    });
  }

  clearAllNotifications(): void {
    if (this.notifications.length > 0) {
      console.log('🗑️ Clearing all notifications');
      
      const deletePromises = this.notifications.map(notification =>
        this.notificationService.deleteNotification(notification.id)
      );
      
      Promise.all(deletePromises.map(obs => obs.toPromise())).then(() => {
        console.log('✅ All notifications cleared');
        this.notificationService.showSuccess('Toutes les notifications ont été supprimées');
      }).catch((error) => {
        console.error('❌ Error clearing all notifications:', error);
        this.notificationService.showError('Erreur lors de la suppression des notifications');
      });
    }
  }

  private updateUnreadCount(): void {
    const count = this.notifications.filter(n => !n.read).length;
    console.log('📊 Updating local unread count:', count);
    this.unreadCount = count;
  }

  ngOnDestroy(): void {
    console.log('🔚 NotificationsComponent destroying...');
    this.destroy$.next();
    this.destroy$.complete();
    this.notificationService.closeConnection();
  }

  getNotificationIcon(type: string | undefined): string {
    const icons: { [key: string]: string } = {
      info: 'info',
      success: 'check_circle',
      warning: 'warning',
      error: 'error',
      alert: 'warning',
      default: 'notifications'
    };
    return icons[type || 'default'] || icons['default'];
  }

  formatDate(date: Date | string | number): string {
    let dateObj: Date;
    
    if (typeof date === 'number') {
      dateObj = new Date(date);
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    
    if (!dateObj || isNaN(dateObj.getTime())) {
      console.warn('⚠️ Invalid date:', date);
      return 'Date invalide';
    }
    
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'À l\'instant';
    } else if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} min`;
    } else if (diffInHours < 24) {
      return `Il y a ${diffInHours}h`;
    } else if (diffInDays < 7) {
      return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    } else {
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
    }
  }

  handleNotificationClick(notification: AppNotification): void {
    console.log('👆 Notification clicked:', notification.id);
    this.markAsRead(notification);
  }

  trackByNotification(index: number, notification: AppNotification): number {
    return notification.id;
  }

  get hasNotifications(): boolean {
    return this.notifications.length > 0;
  }

  get hasUnreadNotifications(): boolean {
    return this.unreadCount > 0;
  }

  get notificationCountText(): string {
    if (this.unreadCount === 0) return '';
    return `${this.unreadCount} non-lu${this.unreadCount > 1 ? 's' : ''}`;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showPanel) {
      console.log('🔄 Closing panel via Escape key');
      this.togglePanel();
    }
  }
}