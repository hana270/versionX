import { Component, ViewChild, AfterViewInit, ViewEncapsulation } from '@angular/core';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { InstallationsService } from '../../../core/services/installations.service';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  className: string;
  extendedProps: {
    affectationId: number;
    commandeId: number;
    installateurId: number;
    installateurNom: string;
    notes: string;
    statut: string;
  };
}

@Component({
  selector: 'app-affectation-calendar',
  templateUrl: './affectation-calendar.component.html',
  styleUrls: ['./affectation-calendar.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AffectationCalendarComponent implements AfterViewInit {
  @ViewChild('fullCalendar') calendarComponent!: FullCalendarComponent;

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: [],
    timeZone: 'local',
    nowIndicator: true,
    eventDisplay: 'block',
    eventTimeFormat: { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    locale: frLocale,
    buttonText: {
      today: 'Aujourd\'hui',
      month: 'Mois',
      week: 'Semaine',
      day: 'Jour'
    },
    allDayText: 'Toute la journée',
    noEventsText: 'Aucun événement à afficher',
    moreLinkText: 'en plus',
    eventDidMount: (info) => {
      const eventDate = new Date(info.event.start!);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        info.el.style.backgroundColor = '#ff6b6b';
        info.el.style.borderColor = '#ff6b6b';
      } else if (eventDate.getTime() === today.getTime()) {
        info.el.style.backgroundColor = '#51cf66';
        info.el.style.borderColor = '#51cf66';
      } else {
        info.el.style.backgroundColor = '#339af0';
        info.el.style.borderColor = '#339af0';
      }
    }
  };

  events: CalendarEvent[] = [];
  loading = true;
  errorMessage: string | null = null;
  stats = {
    total: 0,
    today: 0,
    pending: 0,
    completed: 0
  };

  constructor(private installationsService: InstallationsService) {}

  ngAfterViewInit(): void {
    this.loadAffectations();
  }

  loadAffectations(): void {
    this.loading = true;
    this.errorMessage = null;
    
    this.installationsService.getAllAffectations().subscribe({
      next: (affectations) => {
        this.events = this.mapAffectationsToEvents(affectations);
        this.calculateStats(affectations);
        this.calendarOptions.events = this.events;
        this.refreshCalendar();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading affectations:', err);
        this.errorMessage = 'Erreur lors du chargement des affectations. Veuillez réessayer.';
        this.loading = false;
      }
    });
  }

 private calculateStats(affectations: any[]): void {
  const now = new Date(); // Date et heure actuelles

  this.stats = {
    total: affectations.length,
    today: affectations.filter(a => 
      a.installateurs.some((i: any) => 
        this.isToday(this.arrayToDate(i.dateInstallation, i.heureFin), now)
      )
    ).length,
    pending: affectations.filter(a => 
      a.installateurs.some((i: any) => 
        this.isFuture(this.arrayToDate(i.dateInstallation, i.heureDebut), now)
      )
    ).length,
    completed: affectations.filter(a => 
      a.installateurs.some((i: any) => 
        this.isPast(this.arrayToDate(i.dateInstallation, i.heureFin), now)
      )
    ).length,
  };
}

// Helper 1: Vérifie si une date/heure est aujourd'hui
private isToday(eventDate: Date, now: Date): boolean {
  return (
    eventDate.getDate() === now.getDate() &&
    eventDate.getMonth() === now.getMonth() &&
    eventDate.getFullYear() === now.getFullYear()
  );
}

// Helper 2: Vérifie si une date/heure est future
private isFuture(eventDate: Date, now: Date): boolean {
  return eventDate > now;
}

// Helper 3: Vérifie si une date/heure est passée
private isPast(eventDate: Date, now: Date): boolean {
  return eventDate < now;
}

// Helper 4: Convertit [YYYY, MM, DD] + [HH, MM] en Date
private arrayToDate(dateArray: number[], timeArray: number[]): Date {
  if (!dateArray || !timeArray) return new Date();
  return new Date(
    dateArray[0], 
    dateArray[1] - 1, 
    dateArray[2], 
    timeArray[0] || 0, 
    timeArray[1] || 0
  );
}



  private mapAffectationsToEvents(affectations: any[]): CalendarEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return affectations.flatMap(affectation => {
      return affectation.installateurs.map((inst: any) => {
        try {
          const startDate = this.arrayToDate(inst.dateInstallation, inst.heureDebut);
          const eventDate = new Date(startDate);
          eventDate.setHours(0, 0, 0, 0);

          let timeClass = '';
          if (eventDate < today) {
            timeClass = 'past-event';
          } else if (eventDate.getTime() === today.getTime()) {
            timeClass = 'present-event';
          } else {
            timeClass = 'future-event';
          }

          return {
            id: `${affectation.id}-${inst.installateurId}`,
            title: `${inst.installateurNom} - Cmd #${affectation.commandeId}`,
            start: startDate,
            end: this.arrayToDate(inst.dateInstallation, inst.heureFin),
            className: timeClass,
            allDay: false,
            extendedProps: {
              affectationId: affectation.id,
              commandeId: affectation.commandeId,
              installateurId: inst.installateurId,
              installateurNom: inst.installateurNom,
              notes: affectation.notes,
              statut: affectation.statut
            }
          };
        } catch (error) {
          console.error('Error mapping affectation:', error);
          return null;
        }
      }).filter((event: CalendarEvent | null): event is CalendarEvent => event !== null);
    });
  }

 /* private arrayToDate(dateArray: number[], timeArray: number[]): string {
    if (!dateArray || !timeArray || dateArray.length < 3 || timeArray.length < 2) {
      throw new Error('Invalid date or time array');
    }

    const date = new Date(
      dateArray[0], 
      dateArray[1] - 1,
      dateArray[2],
      timeArray[0],
      timeArray[1]
    );

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }

    return date.toISOString();
  }*/

  private refreshCalendar(): void {
    setTimeout(() => {
      if (this.calendarComponent?.getApi) {
        const calendarApi = this.calendarComponent.getApi();
        calendarApi.refetchEvents();
        calendarApi.render();
      }
    }, 100);
  }

  exportCalendar(): void {
    // Implémentez la logique d'export ici
    console.log('Exporting calendar...');
  }
}