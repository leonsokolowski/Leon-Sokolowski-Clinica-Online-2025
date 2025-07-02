import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Directive({
  selector: '[mensajePDF]',
})
export class MensajePDFDirective {
  private el = inject(ElementRef);

  private mensajeElement: HTMLDivElement | null = null;

  @HostListener('click')
  onClick() {
    this.mostrarMensaje();
  }

  private mostrarMensaje() {
    if (this.mensajeElement) return;

    const mensaje = document.createElement('div');
    mensaje.textContent = 'Tu PDF se está descargando';
    mensaje.style.position = 'fixed';
    mensaje.style.bottom = '20px';
    mensaje.style.left = '50%';
    mensaje.style.transform = 'translateX(-50%)';
    mensaje.style.background = '#323232';
    mensaje.style.color = '#fff';
    mensaje.style.padding = '10px 20px';
    mensaje.style.borderRadius = '8px';
    mensaje.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    mensaje.style.opacity = '0';
    mensaje.style.transition = 'opacity 0.3s ease-in-out';

    document.body.appendChild(mensaje);
    this.mensajeElement = mensaje;

    // Animación de entrada
    requestAnimationFrame(() => {
      if (this.mensajeElement) this.mensajeElement.style.opacity = '1';
    });

    // Remover luego de 3 segundos
    setTimeout(() => {
      if (this.mensajeElement) {
        this.mensajeElement.style.opacity = '0';
        setTimeout(() => {
          if (this.mensajeElement) {
            document.body.removeChild(this.mensajeElement);
            this.mensajeElement = null;
          }
        }, 300); // Esperar que termine la transición
      }
    }, 3000);
  }
}
