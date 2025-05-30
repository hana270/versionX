import { Injectable } from '@angular/core';
import { Message } from '../models/message.model';
import { Conversation } from '../models/conversation.model';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private conversationsData: { 
    clients: Conversation[]; 
    installers: Conversation[] 
} = {
    clients: [
        {
            id: 'client_1',
            name: 'Maram Bel Haj Rhouma',
            avatar: 'M',
            photoUrl: 'assets/img/pdpstatique/4.jpg',
            //status: 'online',
            lastMessage: 'Merci pour votre aide, quand aura lieu l\'installation ?',
            time: '14:32',
            unread: 2,
            //priority: 'normal',
            role: 'client'
        },
        {
            id: 'client_2',
            name: 'Hana Belhadj',
            avatar: 'J',
            photoUrl: 'assets/img/pdpstatique/2.jpg',
            //status: 'away',
            lastMessage: 'J\'ai un problème avec ma commande CMD-2024-001',
            time: '13:15',
            unread: 0,
            //priority: 'urgent',
            role: 'client'
        },
        {
            id: 'client_3',
            name: 'Youssef Ben Salah',
            photoUrl: 'assets/img/pdpstatique/1.jpg',
            avatar: 'S',
            //status: 'offline',
            lastMessage: 'Parfait, merci beaucoup !',
            time: 'Hier',
            unread: 0,
            //priority: 'normal',
            role: 'client'
        }
    ],
    installers: [
        {
            id: 'installer_1',
            name: 'Salah Ben jemaa',
            photoUrl: 'assets/img/pdpstatique/5.jpg',
            avatar: 'P',
            //status: 'online',
            lastMessage: 'Installation terminée, rapport envoyé',
            time: '15:20',
            unread: 1,
            //priority: 'normal',
            role: 'installer'
        },
        {
            id: 'installer_2',
            name: 'Younes Moubarek',
            photoUrl: 'assets/img/pdpstatique/2.jpg',
            avatar: 'L',
            //status: 'online',
            lastMessage: 'Besoin d\'aide pour l\'installation complexe',
            time: '14:45',
            unread: 3,
            //priority: 'high',
            role: 'installer'
        },
        {
            id: 'installer_3',
            name: 'Karim Ben Alia',
            photoUrl: 'assets/img/pdpstatique/4.jpg',
            avatar: 'T',
            //status: 'away',
            lastMessage: 'Rendez-vous confirmé pour demain 9h',
            time: '12:30',
            unread: 0,
            //priority: 'normal',
            role: 'installer'
        }
    ]
};

  private messagesData: { [key: string]: Message[] } = {
    client_1: [
      {
        type: 'received',
        avatar: 'M',
        photoUrl: 'assets/img/pdpstatique/4.jpg',
        text: 'Bonjour, j\'aimerais avoir des informations sur ma commande CMD-2024-001',
        time: '14:20',
        //priority: 'normal'
      },
      {
        type: 'sent',
        avatar: 'A',
        photoUrl: 'assets/img/pdpstatique/5.jpg',
        text: 'Bonjour Maram ! Je vais vérifier le statut de votre commande immédiatement.',
        time: '14:22'
      },
      {
        type: 'sent',
        avatar: 'A',
        photoUrl: 'assets/img/pdpstatique/5.jpg',
        text: 'Votre commande est en cours de préparation. L\'installation est prévue pour demain entre 9h et 12h.',
        time: '14:25'
      },
      {
        type: 'received',
        avatar: 'M',
        photoUrl: 'assets/img/pdpstatique/4.jpg',
        text: 'Merci pour votre aide, quand aura lieu l\'installation ?',
        time: '14:32',
        //priority: 'normal'
      }
    ],
    installer_1: [
      {
        type: 'received',
        avatar: 'P',
        photoUrl: 'assets/img/pdpstatique/4.jpg',
        text: 'Bonjour, l\'installation chez Mme Dubois est terminée. Tout s\'est bien passé.',
        time: '15:10',
        //priority: 'normal'
      },
      {
        type: 'sent',
        avatar: 'A',
        photoUrl: 'assets/img/pdpstatique/4.jpg',
        text: 'Parfait ! Avez-vous rempli le rapport d\'installation ?',
        time: '15:15'
      },
      {
        type: 'received',
        avatar: 'P',
        photoUrl: 'assets/img/pdpstatique/4.jpg',
        text: 'Installation terminée, rapport envoyé',
        time: '15:20',
        //priority: 'normal'
      }
    ]
  };

  private responses = [
    "Merci pour votre message, je vais traiter votre demande.",
    "D'accord, je vous tiens au courant.",
    "Parfait, merci pour l'information !",
    "Je vais vérifier cela immédiatement.",
    "Message bien reçu, je reviens vers vous rapidement."
  ];

  getConversations(role: 'clients' | 'installers'): Conversation[] {
    return this.conversationsData[role];
  }

  getMessages(conversationId: string): Message[] {
    return this.messagesData[conversationId] || [];
  }

   sendMessage(conversationId: string, text: string): void {
    if (!this.messagesData[conversationId]) {
      this.messagesData[conversationId] = [];
    }
    
    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ':' + 
                now.getMinutes().toString().padStart(2, '0');
    
    this.messagesData[conversationId].push({
      type: 'sent',
      avatar: 'A', // Admin avatar
      photoUrl: 'assets/img/pdpstatique/4.jpg',
      text: text,
      time: time
    });
  }

 getRandomResponse() {
    const responses = [
        "Merci pour votre message",
        "Je vais vérifier cela",
        "Pouvez-vous me donner plus de détails?",
        "Je reviens vers vous rapidement"
    ];
    
    // Ajoutez une logique pour sélectionner une image aléatoire
    const randomImage = `assets/img/pdpstatique/${Math.floor(Math.random() * 10) + 1}.jpg`;
    
    return {
        text: responses[Math.floor(Math.random() * responses.length)],
        image: randomImage
    };
}

  // In messaging.service.ts
addMessage(conversationId: string, message: Message): void {
    if (!this.messagesData[conversationId]) {
        this.messagesData[conversationId] = [];
    }
    this.messagesData[conversationId].push(message);
}

  getConversationById(id: string): Conversation | undefined {
    const allConversations = [...this.conversationsData.clients, ...this.conversationsData.installers];
    return allConversations.find(c => c.id === id);
  }
}