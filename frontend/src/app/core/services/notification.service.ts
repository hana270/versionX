import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, switchMap, tap, filter, distinctUntilChanged } from 'rxjs/operators';
import { Notification } from '../models/notification.models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8087/notifications/api/notifications';
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private toasts: any[] = [];
  private toastSubject = new BehaviorSubject<any[]>([]);
  private pollingSubscription: Subscription | null = null;

  // Observables
  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();
  toasts$ = this.toastSubject.asObservable();
  private promotionUpdateSource = new Subject<void>();
  promotionUpdate$ = this.promotionUpdateSource.asObservable();

  constructor(private http: HttpClient) {}

  // Notify promotion update
  notifyPromotionUpdate(): void {
    this.promotionUpdateSource.next();
  }

  // Start notification polling
  startNotificationPolling(intervalTime: number = 5000): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }

    this.pollingSubscription = interval(intervalTime).pipe(
      switchMap(() => this.loadNotifications()),
      filter(notifications => notifications.length > 0),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
    ).subscribe();
  }

  // Stop notification polling
  stopNotificationPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  // Load all notifications
  loadNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl).pipe(
      tap(notifications => {
        // Normalize and validate notifications
        const validatedNotifications = notifications.map(n => this.validateNotification(n));
        // Sort by date (newest first)
        const sortedNotifications = validatedNotifications.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        this.notificationsSubject.next(sortedNotifications);
        this.updateUnreadCount(sortedNotifications);

        // Show toasts for new, unread notifications
        sortedNotifications
          .filter(n => !n.read && !this.toasts.some(t => t.id === n.id.toString()))
          .forEach(notification => {
            this.showToast(
              notification.title,
              notification.message,
              notification.type || 'info',
              5000,
              notification.id.toString()
            );
          });
      }),
      catchError(error => {
        console.error('Error loading notifications', error);
        this.showError('Failed to load notifications', 5000);
        return of([]);
      })
    );
  }

  // Get user-specific notifications
  getUserNotifications(username: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/user/${username}`).pipe(
      tap(notifications => {
        const validatedNotifications = notifications.map(n => this.validateNotification(n));
        const sortedNotifications = validatedNotifications.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        this.notificationsSubject.next(sortedNotifications);
        this.updateUnreadCount(sortedNotifications);

        sortedNotifications
          .filter(n => !n.read && !this.toasts.some(t => t.id === n.id.toString()))
          .forEach(notification => {
            this.showToast(
              notification.title,
              notification.message,
              notification.type || 'info',
              5000,
              notification.id.toString()
            );
          });
      }),
      catchError(error => {
        console.error('Error loading user notifications', error);
        this.showError('Failed to load user notifications', 5000);
        return of([]);
      })
    );
  }

  // Mark a notification as read
  markAsRead(id: number): Observable<void> {
    return this.http.put<Notification>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(updatedNotification => {
        if (updatedNotification) {
          const validatedNotification = this.validateNotification(updatedNotification);
          const notifications = this.notificationsSubject.value.map(n =>
            n.id === id ? validatedNotification : n
          );
          this.notificationsSubject.next(notifications);
          this.updateUnreadCount(notifications);
        }
      }),
      switchMap(() => of(void 0)),
      catchError(error => {
        console.error('Error marking notification as read', error);
        this.showError('Failed to mark notification as read', 5000);
        return of(void 0);
      })
    );
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        const notifications = this.notificationsSubject.value.map(n => ({
          ...n,
          read: true
        }));
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
      }),
      catchError(error => {
        console.error('Error marking all notifications as read', error);
        this.showError('Failed to mark all notifications as read', 5000);
        return of(void 0);
      })
    );
  }

  // Delete a notification
  deleteNotification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const notifications = this.notificationsSubject.value.filter(n => n.id !== id);
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
      }),
      catchError(error => {
        console.error('Error deleting notification', error);
        this.showError('Failed to delete notification', 5000);
        return of(void 0);
      })
    );
  }

  // Send a notification
  sendNotification(title: string, message: string, username: string, type: string = 'info'): Observable<Notification> {
    const notification = {
      title,
      message,
      username,
      type,
      read: false,
      date: new Date().toISOString() // Ensure date is set
    };

    return this.http.post<Notification>(`${this.apiUrl}/send`, notification).pipe(
      tap(newNotification => {
        const validatedNotification = this.validateNotification(newNotification);
        const currentNotifications = this.notificationsSubject.value;
        this.notificationsSubject.next([validatedNotification, ...currentNotifications]);
        this.updateUnreadCount([validatedNotification, ...currentNotifications]);
        this.showToast(
          validatedNotification.title,
          validatedNotification.message,
          validatedNotification.type || 'info',
          5000,
          validatedNotification.id.toString()
        );
      }),
      catchError(error => {
        console.error('Error sending notification', error);
        this.showError('Failed to send notification', 5000);
        return of({} as Notification);
      })
    );
  }
createNotification(notification: Notification): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification).pipe(
      tap(newNotification => {
        const notifications = [newNotification, ...this.notificationsSubject.value].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
      }),
      catchError(error => {
        console.error('Erreur lors de la création de la notification', error);
        return of(null as any);
      })
    );
  }
  // Validate and normalize notification
  private validateNotification(notification: Notification): Notification {
    return {
      ...notification,
      id: notification.id || 0,
      title: notification.title || 'No Title',
      message: notification.message || 'No Message',
      type: notification.type || 'info',
      read: !!notification.read,
      date: notification.date ? new Date(notification.date).toISOString() : new Date().toISOString()
    };
  }

  // Update unread count
  private updateUnreadCount(notifications: Notification[]): void {
    const unreadCount = notifications.filter(n => !n.read).length;
    this.unreadCountSubject.next(unreadCount);
  }

  // Toast methods
  showSuccess(message: string, duration: number = 3000): void {
    this.showToast('Succès', message, 'success', duration);
  }

  showError(message: string, duration: number = 5000): void {
    this.showToast('Erreur', message, 'error', duration);
  }

  showWarning(message: string, duration: number = 5000): void {
    this.showToast('Attention', message, 'warning', duration);
  }

  private showToast(title: string, message: string, type: string, duration: number, id: string = Math.random().toString(36).substring(2, 9)): void {
    const toast = { id, title, message, type, duration };
    this.toasts.push(toast);
    this.toastSubject.next([...this.toasts]);
    setTimeout(() => this.removeToast(toast.id), duration);
  }

  removeToast(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.toastSubject.next([...this.toasts]);
  }
  clearAllNotifications(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/clear-all`).pipe(
      tap(() => {
        this.notificationsSubject.next([]);
        this.updateUnreadCount([]);
      }),
      catchError(error => {
        console.error('Erreur lors de la suppression de toutes les notifications', error);
        return of(void 0);
      })
    );
  }
}