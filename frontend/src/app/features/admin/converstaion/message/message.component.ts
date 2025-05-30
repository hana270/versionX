import { Component, Input } from '@angular/core';
import { Message } from '../../../../core/models/message.model';

@Component({
  selector: 'app-message',
  templateUrl: './message.component.html',
  styleUrl: './message.component.css'
})
export class MessageComponent {
@Input() message!: Message;
  @Input() role: 'clients' | 'installers' = 'clients';

  
}