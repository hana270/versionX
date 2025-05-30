export interface Message {
    type: 'sent' | 'received';
    avatar: string;
    text: string;
    time: string;
    photoUrl: string,
    //priority?: 'urgent' | 'high' | 'normal';
}