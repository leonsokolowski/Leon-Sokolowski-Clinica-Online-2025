import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appSubrayado]'
})
export class SubrayadoDirective {

  @Input() underlineDelay: number = 2000; // Delay en milisegundos (por defecto 2 segundos)
  @Input() underlineColor: string = '#031927'; // Color del subrayado (celeste claro por defecto)
  @Input() underlineDuration: number = 800; // Duración de la animación en ms
  @Input() underlineHeight: string = '2px'; // Grosor del subrayado
  
  private timeoutId?: number;
  private underlineElement?: HTMLElement;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit(): void {
    this.setupElement();
    this.startAnimation();
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private setupElement(): void {
    // Configurar el elemento como contenedor relativo
    this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');
    this.renderer.setStyle(this.el.nativeElement, 'display', 'inline-block');
    
    // Crear el elemento del subrayado
    this.underlineElement = this.renderer.createElement('div');
    this.renderer.addClass(this.underlineElement, 'animated-underline');
    
    // Estilos del subrayado
    this.renderer.setStyle(this.underlineElement, 'position', 'absolute');
    this.renderer.setStyle(this.underlineElement, 'bottom', '0');
    this.renderer.setStyle(this.underlineElement, 'left', '0');
    this.renderer.setStyle(this.underlineElement, 'width', '0%');
    this.renderer.setStyle(this.underlineElement, 'height', this.underlineHeight);
    this.renderer.setStyle(this.underlineElement, 'background-color', this.underlineColor);
    this.renderer.setStyle(this.underlineElement, 'transition', `width ${this.underlineDuration}ms ease-in-out`);
    
    // Añadir el subrayado al elemento
    this.renderer.appendChild(this.el.nativeElement, this.underlineElement);
  }

  private startAnimation(): void {
    this.timeoutId = window.setTimeout(() => {
      if (this.underlineElement) {
        this.renderer.setStyle(this.underlineElement, 'width', '100%');
      }
    }, this.underlineDelay);
  }

  // Método público para reiniciar la animación
  public restartAnimation(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    if (this.underlineElement) {
      // Resetear el subrayado
      this.renderer.setStyle(this.underlineElement, 'width', '0%');
      // Iniciar nuevamente
      this.startAnimation();
    }
  }

  // Método público para activar inmediatamente
  public triggerImmediately(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    if (this.underlineElement) {
      this.renderer.setStyle(this.underlineElement, 'width', '100%');
    }
  }
}
