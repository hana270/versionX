import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AppNotification } from '../models/notification.models';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8087/notifications/api';
  private eventSource: EventSource | null = null;
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private connectionSubject = new Subject<boolean>();
  private toasts: any[] = [];
  private toastSubject = new BehaviorSubject<any[]>([]);
  private promotionUpdateSource = new Subject<void>();
  
  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();
  connection$ = this.connectionSubject.asObservable();
  toasts$ = this.toastSubject.asObservable();
  promotionUpdate$ = this.promotionUpdateSource.asObservable();

  constructor(
    private http: HttpClient,
    private ngZone: NgZone
  ) {
    console.log('🚀 NotificationService initialized');
  }

  initConnection(username: string): void {
    console.log('🔗 Initializing SSE connection for:', username);
    this.closeConnection();

    const url = `${this.apiUrl}/notifications/stream/${username}`;
    console.log('🔗 SSE URL:', url);

    // Get JWT token from localStorage or auth service
    const token = localStorage.getItem('token');
    if (token) {
      console.log('🔑 Using JWT token for SSE');
      // Since EventSource doesn't support headers, we rely on permitAll in SecurityConfig
      // Alternatively, we could use a WebSocket or custom SSE client
    } else {
      console.warn('⚠️ No JWT token found for SSE');
    }

    this.eventSource = new EventSource(url);

    this.eventSource.addEventListener('connected', (event: any) => {
      this.ngZone.run(() => {
        console.log('✅ SSE connection established for:', username);
        console.log('Connected event data:', event.data);
        this.connectionSubject.next(true);
        this.showSuccess('Connexion aux notifications établie');
      });
    });

    this.eventSource.addEventListener('notification', (event: any) => {
      this.ngZone.run(() => {
        try {
          console.log('📨 Raw notification received:', event.data);
          const notification = JSON.parse(event.data) as AppNotification;
          console.log('📨 Parsed notification:', notification);
          
          if (typeof notification.date === 'number') {
            notification.date = new Date(notification.date);
          }
          
          this.addNotification(notification);
          this.showToast(
            notification.title || 'Nouvelle notification',
            notification.message,
            notification.type || 'info',
            notification.type === 'alert' ? 5000 : 3000
          );
        } catch (error) {
          console.error('❌ Error parsing notification:', error, 'Raw data:', event.data);
          this.showError('Erreur lors du traitement de la notification');
        }
      });
    });

    this.eventSource.addEventListener('heartbeat', (event: any) => {
      this.ngZone.run(() => {
        console.log('💓 Heartbeat received:', event.data);
        this.connectionSubject.next(true);
      });
    });

    this.eventSource.onopen = () => {
      this.ngZone.run(() => {
        console.log('🔓 SSE connection opened for:', username);
        this.connectionSubject.next(true);
      });
    };

    this.eventSource.onerror = (error) => {
      this.ngZone.run(() => {
        console.error('❌ SSE Error for:', username, error);
        this.connectionSubject.next(false);
        this.showError('Connexion aux notifications perdue');
        
        setTimeout(() => {
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            console.log('🔄 Attempting to reconnect SSE...');
            this.reconnect(username);
          }
        }, 3000);
      });
    };
  }

  reconnect(username: string, attempt: number = 1): void {
    if (attempt > 5) {
      console.error('❌ Max reconnection attempts reached for:', username);
      this.showError('Impossible de se reconnecter aux notifications');
      return;
    }
    
    const delay = 1000 * attempt;
    console.log(`🔄 Reconnecting SSE (attempt ${attempt}/5) for: ${username} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.eventSource || this.eventSource.readyState !== EventSource.OPEN) {
        this.initConnection(username);
      }
    }, delay);
  }

  closeConnection(): void {
    if (this.eventSource) {
      console.log('🔒 Closing SSE connection');
      this.eventSource.close();
      this.eventSource = null;
      this.connectionSubject.next(false);
    }
  }

  getUserNotifications(username: string): Observable<AppNotification[]> {
    const url = `${this.apiUrl}/user/${username}`;
    console.log('📥 Fetching user notifications from:', url);
    
    return this.http.get<AppNotification[]>(url, { headers: this.getHeaders() }).pipe(
      tap(notifications => {
        console.log('📥 Notifications reçues du backend:', notifications);
        const processedNotifications = notifications.map(notification => ({
          ...notification,
          date: typeof notification.date === 'number' ? new Date(notification.date) : new Date(notification.date)
        }));
        this.notificationsSubject.next(processedNotifications);
        this.updateUnreadCount();
      }),
      catchError(error => {
        console.error('❌ Erreur API notifications:', error);
        this.showError('Erreur lors du chargement des notifications');
        return throwError(() => error);
      })
    );
  }

  getUserUnreadNotifications(username: string): Observable<AppNotification[]> {
    const url = `${this.apiUrl}/user/${username}/unread`;
    console.log('📥 Fetching unread notifications from:', url);
    
    return this.http.get<AppNotification[]>(url, { headers: this.getHeaders() }).pipe(
      tap(notifications => {
        console.log('📥 Notifications non lues reçues du backend:', notifications);
        const processedNotifications = notifications.map(notification => ({
          ...notification,
          date: typeof notification.date === 'number' ? new Date(notification.date) : new Date(notification.date)
        }));
        this.updateUnreadCount();
      }),
      catchError(error => {
        console.error('❌ Erreur API notifications non lues:', error);
        this.showError('Erreur lors du chargement des notifications non lues');
        return throwError(() => error);
      })
    );
  }

  getUnreadCount(username: string): Observable<number> {
    const url = `${this.apiUrl}/user/${username}/unread/count`;
    console.log('📥 Fetching unread count from:', url);
    
    return this.http.get<number>(url, { headers: this.getHeaders() }).pipe(
      tap(count => {
        console.log('📊 Nombre de notifications non lues:', count);
        this.unreadCountSubject.next(count);
      }),
      catchError(error => {
        console.error('❌ Erreur récupération count notifications:', error);
        this.showError('Erreur lors du comptage des notifications non lues');
        return of(0);
      })
    );
  }

  getAllNotifications(): Observable<AppNotification[]> {
    console.log('📥 Fetching all notifications');
    return this.http.get<AppNotification[]>(this.apiUrl, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('❌ Erreur récupération toutes les notifications:', error);
        this.showError('Erreur lors du chargement de toutes les notifications');
        return throwError(() => error);
      })
    );
  }

  markAsRead(id: number): Observable<AppNotification> {
    const url = `${this.apiUrl}/${id}/read`;
    console.log('✅ Marking notification as read:', id);
    
    return this.http.put<AppNotification>(url, {}, { headers: this.getHeaders() }).pipe(
      tap((updatedNotification) => {
        console.log('✅ Notification marked as read:', id);
        const notifications = this.notificationsSubject.value.map(n => 
          n.id === id ? { ...n, read: true } : n
        );
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount();
        this.showSuccess('Notification marquée comme lue');
      }),
      catchError(this.handleError<AppNotification>('markAsRead'))
    );
  }

  markAllAsRead(): Observable<void> {
    const url = `${this.apiUrl}/read-all`;
    console.log('✅ Marking all notifications as read');
    
    return this.http.put<void>(url, {}, { headers: this.getHeaders() }).pipe(
      tap(() => {
        console.log('✅ All notifications marked as read');
        const notifications = this.notificationsSubject.value.map(n => ({ ...n, read: true }));
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount();
        this.showSuccess('Toutes les notifications marquées comme lues');
      }),
      catchError(this.handleError<void>('markAllAsRead'))
    );
  }

  deleteNotification(id: number): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    console.log('🗑️ Deleting notification:', id);
    
    return this.http.delete<void>(url, { headers: this.getHeaders() }).pipe(
      tap(() => {
        console.log('🗑️ Notification deleted:', id);
        const notifications = this.notificationsSubject.value.filter(n => n.id !== id);
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount();
        this.showSuccess('Notification supprimée');
      }),
      catchError(this.handleError<void>('deleteNotification'))
    );
  }

  createNotification(notification: AppNotification): Observable<AppNotification> {
    console.log('📤 Creating notification:', notification);
    return this.http.post<AppNotification>(this.apiUrl, notification, { headers: this.getHeaders() }).pipe(
      tap(() => this.showSuccess('Notification créée')),
      catchError(this.handleError<AppNotification>('createNotification'))
    );
  }

  sendNotification(notification: AppNotification): Observable<void> {
    const url = `${this.apiUrl}/send`;
    console.log('📤 Sending notification:', notification);
    return this.http.post<void>(url, notification, { headers: this.getHeaders() }).pipe(
      tap(() => this.showSuccess('Notification envoyée')),
      catchError(this.handleError<void>('sendNotification'))
    );
  }

  sendStockAdjustmentNotification(adminUsername: string, product: string, quantity: number): Observable<void> {
    const url = `${this.apiUrl}/ajustement-stock`;
    const params = { 
      adminUsername, 
      produit: product, 
      quantite: quantity.toString() 
    };
    
    console.log('📤 Sending stock adjustment notification:', params);
    
    return this.http.post<void>(url, null, { params, headers: this.getHeaders() }).pipe(
      tap(() => {
        console.log('✅ Stock adjustment notification sent');
        this.showSuccess('Notification d\'ajustement de stock envoyée');
      }),
      catchError(this.handleError<void>('sendStockAdjustmentNotification'))
    );
  }

  sendCreationCommandeNotification(clientId: number, numeroCommande: string): Observable<void> {
    const url = `${this.apiUrl}/creation-commande`;
    const params = { 
      clientId: clientId.toString(), 
      numeroCommande 
    };
    console.log('📤 Sending commande creation notification:', params);
    return this.http.post<void>(url, null, { params, headers: this.getHeaders() }).pipe(
      tap(() => this.showSuccess('Notification de création de commande envoyée')),
      catchError(this.handleError<void>('sendCreationCommandeNotification'))
    );
  }

  sendPaiementConfirmeNotification(clientId: number, numeroCommande: string): Observable<void> {
    const url = `${this.apiUrl}/paiement-confirme`;
    const params = { 
      clientId: clientId.toString(), 
      numeroCommande 
    };
    console.log('📤 Sending paiement confirmation notification:', params);
    return this.http.post<void>(url, null, { params, headers: this.getHeaders() }).pipe(
      tap(() => this.showSuccess('Notification de confirmation de paiement envoyée')),
      catchError(this.handleError<void>('sendPaiementConfirmeNotification'))
    );
  }

  testStockAlert(adminUsername: string, product: string, quantity: number): Observable<void> {
    const url = `${this.apiUrl}/test-stock-alert`;
    const params = { 
      adminUsername, 
      produit: product, 
      quantite: quantity.toString() 
    };
    
    console.log('🧪 Testing stock alert:', params);
    
    return this.http.post<void>(url, null, { params, headers: this.getHeaders() }).pipe(
      tap(() => {
        console.log('✅ Test stock alert sent');
        this.showSuccess('Alerte de stock test envoyée');
      }),
      catchError(this.handleError<void>('testStockAlert'))
    );
  }

  showSuccess(message: string, duration: number = 3000): void {
    console.log('✅ Showing success toast:', message);
    this.showToast('Succès', message, 'success', duration);
  }

  showError(message: string, duration: number = 5000): void {
    console.log('❌ Showing error toast:', message);
    this.showToast('Erreur', message, 'error', duration);
  }

  showInfo(message: string, duration: number = 3000): void {
    console.log('ℹ️ Showing info toast:', message);
    this.showToast('Information', message, 'info', duration);
  }

  showWarning(message: string, duration: number = 4000): void {
    console.log('⚠️ Showing warning toast:', message);
    this.showToast('Attention', message, 'warning', duration);
  }

  private showToast(title: string, message: string, type: string, duration: number): void {
    const toast = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      type,
      duration
    };
    
    console.log('🍞 Showing toast:', toast);
    this.toasts.push(toast);
    this.toastSubject.next([...this.toasts]);
    
    setTimeout(() => this.removeToast(toast.id), duration);
  }

  removeToast(id: string): void {
    console.log('🍞 Removing toast:', id);
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.toastSubject.next([...this.toasts]);
  }

  notifyPromotionUpdate(): void {
    console.log('📣 Notifying promotion update');
    this.promotionUpdateSource.next();
  }

  private addNotification(notification: AppNotification): void {
    console.log('🔔 Raw notification received:', notification);
    
    if (typeof notification.date === 'number') {
      notification.date = new Date(notification.date);
    }
    
    const currentNotifications = this.notificationsSubject.value;
    
    if (!currentNotifications.some(n => n.id === notification.id)) {
      console.log('➕ Adding new notification:', {
        id: notification.id,
        title: notification.title,
        date: notification.date,
        read: notification.read
      });
      this.notificationsSubject.next([notification, ...currentNotifications]);
      this.updateUnreadCount();
    } else {
      console.log('⚠️ Notification already exists:', notification.id);
    }
  }

  private updateUnreadCount(): void {
    const count = this.notificationsSubject.value.filter(n => !n.read).length;
    console.log('📊 Updating unread count:', count);
    this.unreadCountSubject.next(count);
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`❌ ${operation} failed:`, error.message, error);
      let errorMessage = `Erreur lors de ${operation}`;
      if (error.status === 403) {
        errorMessage = 'Accès refusé. Vérifiez votre authentification.';
      } else if (error.status === 404) {
        errorMessage = 'Ressource non trouvée.';
      }
      this.showError(errorMessage);
      return of(result as T);
    };
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }
}