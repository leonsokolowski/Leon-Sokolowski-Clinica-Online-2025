import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'horarioFormato',
  standalone: true
})
export class HorarioFormatoPipe implements PipeTransform {
  
  transform(hora: string): string {
    if (!hora) return '';
    
    const [horas, minutos] = hora.split(':');
    const horaNum = parseInt(horas);
    const ampm = horaNum >= 12 ? 'PM' : 'AM';
    const hora12 = horaNum % 12 || 12;
    return `${hora12}:${minutos} ${ampm}`;
  }
}