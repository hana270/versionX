export interface Conversation {
    id: string;
    name: string;
    avatar: string;
    photoUrl:string;

    //status: 'online' | 'away' | 'offline';
    lastMessage: string;
    time: string;
    unread: number;
    //priority: 'urgent' | 'high' | 'normal';
    role: 'client' | 'installer';
}