import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { Paciente } from '../../clases/usuario';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-historia-clinica',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historia-clinica.component.html',
  styleUrl: './historia-clinica.component.css'
})
export class HistoriaClinicaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private db = inject(DatabaseService);
  private auth = inject(AuthService);

  paciente: Paciente | null = null;
  turnos: any[] = [];
  loading = true;
  error = '';
  esVistaAnidada = false; // Para detectar si es una ruta hija

  async ngOnInit() {
    // Detectar si es una ruta hija de mi-perfil
    this.detectarContexto();
    
    try {
      await this.cargarDatos();
    } catch (error) {
      console.error('Error al cargar historia clínica:', error);
      this.error = 'Error al cargar la historia clínica';
    } finally {
      this.loading = false;
    }
  }

  private detectarContexto() {
    // Verificar si la ruta actual es una ruta hija de mi-perfil
    const url = this.router.url;
    this.esVistaAnidada = url.includes('mi-perfil/historia-clinica');
  }

  private async cargarDatos() {
    // Obtener ID del paciente desde la ruta o del usuario actual
    const pacienteIdParam = this.route.snapshot.paramMap.get('pacienteId');
    
    let pacienteId: number;
    
    if (pacienteIdParam) {
      // Caso: Admin o Especialista accediendo a historia de otro paciente
      pacienteId = parseInt(pacienteIdParam);
    } else {
      // Caso: Paciente accediendo a su propia historia desde "Mi Perfil" o ruta directa
      const usuarioActual = await this.auth.obtenerUsuarioActual();
      if (!usuarioActual || usuarioActual.perfil !== 'paciente') {
        throw new Error('No se pudo identificar al paciente');
      }
      pacienteId = usuarioActual.id!;
    }

    // Cargar datos del paciente
    await this.cargarPaciente(pacienteId);
    
    // Cargar turnos del paciente
    await this.cargarTurnos(pacienteId);
  }

  private async cargarPaciente(pacienteId: number) {
    // Obtener todos los usuarios con perfil paciente
    const pacientes = await this.db.obtenerPacientes();
    this.paciente = pacientes.find(p => p.id === pacienteId) || null;
    
    if (!this.paciente) {
      throw new Error('Paciente no encontrado');
    }
  }

  private async cargarTurnos(pacienteId: number) {
    // Usar el método existente para obtener turnos con detalles
    this.turnos = await this.db.obtenerTurnosConDetalles('paciente', pacienteId);
    
    // Filtrar solo turnos finalizados para la historia clínica
    this.turnos = this.turnos.filter(turno => turno.estado === 'finalizado');
  }

  // Método para navegar atrás según el contexto
  volver() {
    if (this.esVistaAnidada) {
      // Si es vista anidada, navegar de vuelta al perfil
      this.router.navigate(['../'], { relativeTo: this.route });
    } else {
      // Si es vista independiente, navegar según el rol del usuario
      // Aquí puedes implementar lógica específica según necesites
      this.router.navigate(['/usuarios']); // Por ejemplo, para admins
    }
  }

  formatearFecha(fecha: string): string {
    const partes = fecha.split('-');
    if (partes.length === 3) {
      const año = parseInt(partes[0]);
      const mes = parseInt(partes[1]) - 1; // Los meses en JavaScript son 0-11
      const dia = parseInt(partes[2]);
      const fechaObj = new Date(año, mes, dia);
      return fechaObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    // Fallback al método original si no se puede parsear
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatearHora(hora: string): string {
    return hora.substring(0, 5); // Quitar los segundos (HH:MM)
  }

  obtenerDatosDinamicos(turno: any): { clave: string; valor: string }[] {
    if (!turno.datos_dinamicos) return [];
    
    return Object.entries(turno.datos_dinamicos).map(([clave, valor]) => ({
      clave,
      valor: valor as string
    }));
  }
}