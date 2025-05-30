import '@angular/localize/init';

declare module '*.json' {
    const value: any;
    export default value;
  }
declare module 'jspdf';
declare module 'html2canvas';

declare var $: any;
declare var DataTable: any;