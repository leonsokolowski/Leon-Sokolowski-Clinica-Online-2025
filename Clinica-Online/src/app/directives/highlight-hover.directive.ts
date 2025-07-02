import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appHighlightHover]'
})
export class HighlightHoverDirective {
constructor(private el: ElementRef, private renderer: Renderer2) {
    this.setupElement();
  }

  private setupElement(): void {
    // Configurar el elemento como contenedor relativo
    this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');
    this.renderer.setStyle(this.el.nativeElement, 'overflow', 'hidden');
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'color 0.3s ease');
    
    // Crear el elemento de overlay para el efecto
    const overlay = this.renderer.createElement('div');
    this.renderer.addClass(overlay, 'highlight-overlay');
    
    // Estilos del overlay
    this.renderer.setStyle(overlay, 'position', 'absolute');
    this.renderer.setStyle(overlay, 'top', '0');
    this.renderer.setStyle(overlay, 'left', '-100%');
    this.renderer.setStyle(overlay, 'width', '100%');
    this.renderer.setStyle(overlay, 'height', '100%');
    this.renderer.setStyle(overlay, 'background-color', '#87CEEB'); // Celeste claro
    this.renderer.setStyle(overlay, 'transition', 'left 0.4s ease-in-out');
    this.renderer.setStyle(overlay, 'z-index', '-1');
    
    // Añadir el overlay al elemento
    this.renderer.appendChild(this.el.nativeElement, overlay);
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    const overlay = this.el.nativeElement.querySelector('.highlight-overlay');
    if (overlay) {
      this.renderer.setStyle(overlay, 'left', '0');
      // Cambiar color del texto para contraste
      this.renderer.setStyle(this.el.nativeElement, 'color', '#333');
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    const overlay = this.el.nativeElement.querySelector('.highlight-overlay');
    if (overlay) {
      this.renderer.setStyle(overlay, 'left', '100%');
      // Restaurar color original del texto
      this.renderer.setStyle(this.el.nativeElement, 'color', 'inherit');
    }
  }
}
