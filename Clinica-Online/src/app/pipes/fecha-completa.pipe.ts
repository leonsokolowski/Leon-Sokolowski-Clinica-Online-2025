import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fechaCompleta',
  standalone: true
})
export class FechaCompletaPipe implements PipeTransform {
  
  transform(fecha: string): string {
    if (!fecha) return '';
    
    const [dia, mes] = fecha.split('/');
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return `${dia} de ${meses[parseInt(mes) - 1]}`;
  }
}