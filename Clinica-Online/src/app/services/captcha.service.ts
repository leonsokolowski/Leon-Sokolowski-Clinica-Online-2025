// captcha.service.ts
import { Injectable } from '@angular/core';

// Declarar grecaptcha como variable global para TypeScript
declare global {
  interface Window {
    grecaptcha: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class CaptchaService {
  
  constructor() {}

  // Verificar si el token del captcha es válido (validación del lado cliente)
  isCaptchaTokenValid(token: string | null): boolean {
    return token !== null && token.length > 0;
  }

  // Validar formato básico del token (sin backend)
  isValidCaptchaFormat(token: string): boolean {
    // Los tokens de reCAPTCHA tienen un formato específico
    return token.length > 20 && /^[A-Za-z0-9_-]+$/.test(token);
  }

  // Guardar el token con timestamp para controlar expiración
  storeCaptchaToken(token: string): void {
    const captchaData = {
      token: token,
      timestamp: Date.now()
    };
    // Usar variables en memoria en lugar de sessionStorage para Claude.ai
    (window as any).captchaData = captchaData;
  }

  // Obtener el token almacenado
  getStoredCaptchaToken(): string | null {
    const captchaData = (window as any).captchaData;
    if (!captchaData) return null;
    
    // Verificar si no ha expirado
    if (this.isCaptchaExpired(captchaData.timestamp)) {
      this.clearCaptchaToken();
      return null;
    }
    
    return captchaData.token;
  }

  // Limpiar el token almacenado
  clearCaptchaToken(): void {
    delete (window as any).captchaData;
  }

  // Verificar si el captcha ha expirado (reCAPTCHA expira en 2 minutos)
  isCaptchaExpired(timestamp: number): boolean {
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000; // 2 minutos en millisegundos
    return (now - timestamp) > twoMinutes;
  }

  // Resetear captcha (útil cuando hay errores)
  resetCaptcha(): void {
    this.clearCaptchaToken();
    // Verificar si grecaptcha está disponible antes de usarlo
    if (typeof window !== 'undefined' && window.grecaptcha) {
      try {
        window.grecaptcha.reset();
      } catch (error) {
        console.warn('Error al resetear grecaptcha:', error);
      }
    }
  }

  // Validar que el captcha esté completado antes del submit
  validateCaptchaForSubmit(): { isValid: boolean; message: string } {
    const token = this.getStoredCaptchaToken();
    
    if (!token) {
      return {
        isValid: false,
        message: 'Por favor, completa el captcha para continuar.'
      };
    }

    if (!this.isValidCaptchaFormat(token)) {
      return {
        isValid: false,
        message: 'El captcha no es válido. Por favor, inténtalo nuevamente.'
      };
    }

    return {
      isValid: true,
      message: ''
    };
  }

  // Método adicional para verificar si grecaptcha está cargado
  isGrecaptchaLoaded(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.grecaptcha !== 'undefined' && 
           typeof window.grecaptcha.reset === 'function';
  }
}