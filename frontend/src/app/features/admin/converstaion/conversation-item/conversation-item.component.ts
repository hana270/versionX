import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Conversation } from '../../../../core/models/conversation.model';

@Component({
  selector: 'app-conversation-item',
  templateUrl: './conversation-item.component.html',
  styleUrl: './conversation-item.component.css'
})
export class ConversationItemComponent {
@Input() conversation!: Conversation;
  @Input() isActive: boolean = false;
  @Output() select = new EventEmitter<string>();

  /*getPriorityText(priority: string): string {
    return priority === 'urgent' ? 'Urgent' : 
           priority === 'high' ? 'Priorité élevée' : '';
  }*/

  onSelect(): void {
    this.select.emit(this.conversation.id);
  }
}
