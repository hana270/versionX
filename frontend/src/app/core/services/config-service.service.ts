import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigServiceService {
  private _apiUrl = environment.apiUrl;
  private _aquatresorApiUrl: string;
  private _notificationsBasePath = environment.notificationsBasePath;
  private _ordersBasePath = environment.ordersBasePath;
  private _usersBasePath = environment.usersBasePath;
  private _installationsBasePath = environment.installationsBasePath;
 // private _paymentBasePath = environment.paymentBasePath;
  constructor() { 
    this._apiUrl = environment.apiUrl;
    this._aquatresorApiUrl = `${this._apiUrl}${environment.aquatresorBasePath}`;
  }

  get apiUrl(): string {
    return this._apiUrl;
  }

  get aquatresorApiUrl(): string {
    return this._aquatresorApiUrl;
  }

  get notificationsApiUrl(): string {
    return `${this._apiUrl}${this._notificationsBasePath}`;
  }

  get ordersApiUrl(): string {
    return `${this._apiUrl}${this._ordersBasePath}`;
  }

  get usersApiUrl(): string {
    return `${this._apiUrl}${this._usersBasePath}`;
  }

  get installationsApiUrl(): string {
    return `${this._apiUrl}${this._installationsBasePath}`;
  }
/*
  get paymentBasePathUrl(): string {
    return `${this._apiUrl}${this._paymentBasePath}`;
  }
*/

  // Helper method for building specific endpoints
  buildUrl(basePath: string, path: string): string {
    return `${this._apiUrl}${basePath}${path}`;
  }
}
