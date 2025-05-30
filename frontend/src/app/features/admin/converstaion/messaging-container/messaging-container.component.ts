import { Component, ElementRef, ViewChild } from '@angular/core';
import { Conversation } from '../../../../core/models/conversation.model';
import { Message } from '../../../../core/models/message.model';
import { MessagingService } from '../../../../core/services/messaging.service';
import { icons } from 'lucide-angular';

@Component({
  selector: 'app-messaging-container',
  templateUrl: './messaging-container.component.html',
  styleUrl: './messaging-container.component.css'
})
export class MessagingContainerComponent {
    @ViewChild('messageInputRef') messageInputRef!: ElementRef<HTMLTextAreaElement>;

currentRole: 'clients' | 'installers' = 'clients';
  currentConversation: string = 'client_1';
  conversations: Conversation[] = [];
  messages: Message[] = [];
  selectedConversation: Conversation | undefined;
  isTyping = false;
  typingUser = '';
  lucideIcons = icons; 
  searchTerm: string = '';
filteredConversations: any[] = this.conversations;

  constructor(private messagingService: MessagingService) {}

  ngOnInit(): void {
    this.loadConversations();
    this.loadConversationDetails(this.currentConversation);
    this.loadMessages(this.currentConversation);
  }

  switchRole(role: 'clients' | 'installers'): void {
    this.currentRole = role;
    this.loadConversations();
  }

  loadConversations(): void {
    this.conversations = this.messagingService.getConversations(this.currentRole);
  }

  selectConversation(conversationId: string): void {
    this.currentConversation = conversationId;
    this.loadConversationDetails(conversationId);
    this.loadMessages(conversationId);
  }

  loadConversationDetails(conversationId: string): void {
    this.selectedConversation = this.messagingService.getConversationById(conversationId);
  }

  loadMessages(conversationId: string): void {
    this.messages = this.messagingService.getMessages(conversationId);
  }

  /*get conversationStatus() {
    return this.selectedConversation?.status || 'offline';
  }*/

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

 sendMessage(text: string): void {
  if (!text.trim() || !this.currentConversation) return;

  // Envoyer le message
  this.messagingService.sendMessage(this.currentConversation, text);
  this.clearInput();
  this.loadMessages(this.currentConversation);

  // Simuler une réponse
  setTimeout(() => {
    this.showTypingIndicator();
    setTimeout(() => {
      this.hideTypingIndicator();
      this.simulateResponse();
    }, 2000);
  }, 1000);
}

   clearInput(): void {
    if (this.messageInputRef) {
      this.messageInputRef.nativeElement.value = '';
    }
  }

 simulateResponse(): void {
    const response = this.messagingService.getRandomResponse();
    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ':' + 
                now.getMinutes().toString().padStart(2, '0');
    
    const conversation = this.messagingService.getConversationById(this.currentConversation);
    
    this.messagingService.addMessage(this.currentConversation, {
      type: 'received',
      photoUrl: response.image, // Utilisez l'image aléatoire
      avatar: conversation?.avatar || 'U',
      text: response.text,
      time: time
    });
    
    this.loadMessages(this.currentConversation);
}

  showTypingIndicator(): void {
    const conversation = this.messagingService.getConversationById(this.currentConversation);
    this.typingUser = conversation?.name.split(' ')[0] || 'Utilisateur';
    this.isTyping = true;
  }

  hideTypingIndicator(): void {
    this.isTyping = false;
  }

  getStatusText(status: 'online' | 'away' | 'offline'): string {
    return status === 'online' ? 'En ligne' : 
           status === 'away' ? 'Absent' : 'Hors ligne';
  }

  filterConversations() {
  if (!this.searchTerm) {
    this.filteredConversations = this.conversations;
    return;
  }
  
  this.filteredConversations = this.conversations.filter(conv => 
    conv.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(this.searchTerm.toLowerCase())
  );
}
}
