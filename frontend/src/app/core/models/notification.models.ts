export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'ORDER' | 'PAYMENT' | 'STOCK' | 'INFO';
  read: boolean;
  date: string; // ISO 8601 string (e.g., "2025-05-31T14:09:00")
  username?: string;
}