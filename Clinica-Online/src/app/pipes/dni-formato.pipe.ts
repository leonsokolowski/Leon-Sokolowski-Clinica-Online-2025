import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'dniFormato',
  standalone: true
})
export class DniFormatoPipe implements PipeTransform {
  
  transform(dni: string | number | null | undefined): string {
    if (!dni) return '';
    
    // Convertir a string y limpiar caracteres no numéricos
    const dniStr = dni.toString().replace(/\D/g, '');
    
    // Validar que tenga entre 7 y 8 dígitos (DNI argentino)
    if (dniStr.length < 7 || dniStr.length > 8) {
      return dni.toString(); // Devolver original si no es válido
    }
    
    // Formatear con puntos
    return dniStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}

