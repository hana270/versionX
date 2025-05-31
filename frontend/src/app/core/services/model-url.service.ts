import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, timeout, retry } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ModelUrlService {
  constructor(private http: HttpClient) {}

  /**
   * Convertit une URL GitHub en URL utilisable
   */
  convertGithubUrl(url: string): string {
    if (!url) return '';

    // Si ce n'est pas une URL GitHub, retourner telle quelle
    if (!url.includes('github.com')) {
      return url;
    }

    // Nettoyer l'URL
    let cleanUrl = url;

    // Convertir github.com vers raw.githubusercontent.com
    if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
      cleanUrl = url
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
    }

    // Décoder les caractères encodés
    cleanUrl = decodeURIComponent(cleanUrl);

    // Obtenir l'URL optimisée
    return this.getOptimizedUrl(cleanUrl);
  }

  /**
   * Obtient l'URL optimisée via JSDelivr
   */
  private getOptimizedUrl(originalUrl: string): string {
    const githubMatch = originalUrl.match(/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)/);

    if (githubMatch) {
      const [, username, repo, branch, filePath] = githubMatch;
      return `https://cdn.jsdelivr.net/gh/${username}/${repo}@${branch}/${filePath}`;
    }

    return originalUrl;
  }

  /**
   * Vérifie la disponibilité d'un modèle avec fallback
   */
  checkModelAvailability(originalUrl: string): Observable<string> {
    const urls = this.generateFallbackUrls(originalUrl);
    return this.tryUrls(urls);
  }

  /**
   * Génère plusieurs URLs de fallback
   */
  private generateFallbackUrls(originalUrl: string): string[] {
    const urls: string[] = [];

    // URL optimisée principale
    urls.push(this.convertGithubUrl(originalUrl));

    // Si c'est une URL GitHub, générer des alternatives
    if (originalUrl.includes('github.com') || originalUrl.includes('raw.githubusercontent.com')) {
      const githubMatch = originalUrl.match(/(?:github\.com|raw\.githubusercontent\.com)\/([^\/]+)\/([^\/]+)\/(?:blob\/)?([^\/]+)\/(.+)/);

      if (githubMatch) {
        const [, username, repo, branch, filePath] = githubMatch;
        // JSDelivr
        urls.push(`https://cdn.jsdelivr.net/gh/${username}/${repo}@${branch}/${filePath}`);
        // Raw GitHub
        urls.push(`https://raw.githubusercontent.com/${username}/${repo}/${branch}/${filePath}`);
      }
    }

    // Supprimer les doublons
    return [...new Set(urls)];
  }

  /**
   * Teste les URLs une par une jusqu'à en trouver une qui fonctionne
   */
  private tryUrls(urls: string[]): Observable<string> {
    if (urls.length === 0) {
      return throwError(() => new Error('Aucune URL disponible'));
    }

    const currentUrl = urls[0];
    const remainingUrls = urls.slice(1);

    return this.testUrl(currentUrl).pipe(
      map(() => currentUrl),
      catchError(() => {
        if (remainingUrls.length > 0) {
          return this.tryUrls(remainingUrls);
        }
        return throwError(() => new Error('Impossible de charger le modèle depuis toutes les URLs tentées'));
      })
    );
  }

  /**
   * Teste si une URL est accessible
   */
testUrl(url: string): Observable<boolean> {
    // Créer une requête simple sans en-têtes d'autorisation
    const headers = new HttpHeaders({
      'Accept': '*/*',
      'Content-Type': 'text/plain'
    });

    // Utiliser 'json' comme responseType pour éviter les problèmes CORS
    return this.http.head(url, {
      headers: headers,
      observe: 'response',
      responseType: 'json' // Changé de 'text' à 'json'
    }).pipe(
      timeout(5000000000),
      retry(1),
      map(response => response.status === 200 || response.status === 304),
      catchError(() => of(false))
    );
  }

  /**
   * Génère l'URL USDZ pour iOS
   */
  generateUsdzUrl(modelUrl: string): string {
    if (!modelUrl) return '';
    let usdzUrl = modelUrl.replace(/\.(glb|gltf)$/i, '.usdz');
    return this.convertGithubUrl(usdzUrl);
  }

  /**
   * Crée l'URL AR appropriée selon la plateforme
   */
  createARUrl(modelUrl: string): string {
    const encodedUrl = encodeURIComponent(modelUrl);
    if (this.isIOSDevice()) {
      return `https://usdz.webxr.run?url=${encodedUrl}`;
    }
    return `https://arvr.google.com/scene-viewer/1.0?file=${encodedUrl}&mode=ar_preferred`;
  }

  /**
   * Détecte si l'appareil est iOS
   */
  private isIOSDevice(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
}