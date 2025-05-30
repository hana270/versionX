// notification.model.ts
export interface AppNotification {
  id: number;
  title: string;
  message: string;
  date: Date | string;
  read: boolean;
  username?: string;
type: 'info' | 'success' | 'warning' | 'error' | 'alert' | undefined;}