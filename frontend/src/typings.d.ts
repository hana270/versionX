// Initialisation Angular i18n
import '@angular/localize/init';

// Déclarations pour les fichiers JSON
declare module '*.json' {
  const value: unknown;
  export default value;
}

// Déclarations pour jsPDF avec un typage basique
declare module 'jspdf' {
  interface jsPDFOptions {
    orientation?: 'portrait' | 'landscape';
    unit?: 'pt' | 'mm' | 'cm' | 'in';
    format?: string | number[];
  }

  class jsPDF {
    constructor(options?: jsPDFOptions);
    text(text: string, x: number, y: number): void;
    addImage(imageData: string, format: string, x: number, y: number, width: number, height: number): void;
    save(filename?: string): void;
    // Ajoutez d'autres méthodes au besoin
  }

  export = jsPDF;
}

// Déclaration pour html2canvas
declare module 'html2canvas' {
  interface Html2CanvasOptions {
    scale?: number;
    useCORS?: boolean;
    allowTaint?: boolean;
    // Ajoutez d'autres options au besoin
  }

  function html2canvas(element: HTMLElement, options?: Html2CanvasOptions): Promise<HTMLCanvasElement>;
  export = html2canvas;
}

// Déclarations globales pour jQuery et DataTables avec typage fort
import * as jQuery from 'jquery';
import { DataTables } from 'datatables.net';

declare global {
  // jQuery
  const $: typeof jQuery;
  const jQuery: typeof jQuery;

  // DataTables
  interface JQuery {
    DataTable(options?: DataTables.Settings): DataTables.Api;
    dataTable(options?: DataTables.Settings): DataTables.Api;
  }

  // Extension pour d'autres plugins jQuery si nécessaire
  interface JQuery {
    modal(action: 'show' | 'hide' | 'toggle'): JQuery;
    // Ajoutez d'autres extensions de plugins ici
  }
}

declare module 'lucide-angular';
