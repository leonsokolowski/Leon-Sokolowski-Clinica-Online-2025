import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mis-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-turnos.component.html',
  styleUrl: './mis-turnos.component.css'
})
export class MisTurnosComponent implements OnInit {
  private dbService = inject(DatabaseService);
  private authService = inject(AuthService);

  turnos: any[] = [];
  turnosFiltrados: any[] = [];
  filtro: string = '';
  cargando: boolean = false;
  especialistaId: number = 0;
  usuarioActual: any = null;

  // Variables para modales
  mostrarModalCancelar: boolean = false;
  mostrarModalRechazar: boolean = false;
  mostrarModalFinalizar: boolean = false;
  mostrarModalResena: boolean = false;
  
  turnoSeleccionado: any = null;
  comentarioCancelacion: string = '';
  comentarioRechazo: string = '';
  resenaConsulta: string = '';
  diagnostico: string = '';

  async ngOnInit() {
    await this.cargarUsuarioYTurnos();
  }

  async cargarUsuarioYTurnos() {
    try {
      this.cargando = true;
      
      // Primero obtenemos el usuario actual
      this.usuarioActual = await this.authService.obtenerUsuarioActual();
      
      if (!this.usuarioActual) {
        console.error('No se pudo obtener el usuario actual');
        return;
      }

      // Solo procesamos si es especialista
      if (this.usuarioActual.perfil === 'especialista') {
        this.especialistaId = this.usuarioActual.id;
        await this.cargarTurnos();
      }
      
    } catch (error) {
      console.error('Error al cargar usuario y turnos:', error);
    } finally {
      this.cargando = false;
    }
  }

  // Método para verificar si el usuario puede ver el componente
  puedeVerComponente(): boolean {
    return this.usuarioActual && this.usuarioActual.perfil === 'especialista';
  }

  async cargarTurnos() {
    if (!this.especialistaId) return;
    
    try {
      this.cargando = true;
      this.turnos = await this.dbService.obtenerTurnosEspecialista(this.especialistaId);
      this.turnosFiltrados = [...this.turnos];
      console.log('Turnos cargados:', this.turnos); // Para debug
    } catch (error) {
      console.error('Error al cargar turnos:', error);
    } finally {
      this.cargando = false;
    }
  }

  async aplicarFiltro() {
    if (!this.filtro.trim()) {
      this.turnosFiltrados = [...this.turnos];
      return;
    }

    try {
      this.cargando = true;
      this.turnosFiltrados = await this.dbService.filtrarTurnosEspecialista(
        this.especialistaId, 
        this.filtro.trim()
      );
    } catch (error) {
      console.error('Error al filtrar turnos:', error);
      this.turnosFiltrados = [];
    } finally {
      this.cargando = false;
    }
  }

  limpiarFiltro() {
    this.filtro = '';
    this.turnosFiltrados = [...this.turnos];
  }

  // Métodos para verificar qué acciones mostrar según los estados correctos
  puedeAceptar(turno: any): boolean {
    const estado = turno.estado?.toLowerCase();
    return estado === 'pendiente'; // Solo si está pendiente
  }

  puedeRechazar(turno: any): boolean {
    const estado = turno.estado?.toLowerCase();
    return estado === 'pendiente'; // Solo si está pendiente
  }

  puedeCancelar(turno: any): boolean {
    const estado = turno.estado?.toLowerCase();
    return estado === 'aceptado'; // Solo si fue aceptado
  }

  puedeFinalizar(turno: any): boolean {
    const estado = turno.estado?.toLowerCase();
    return estado === 'aceptado'; // Solo si fue aceptado
  }

  puedeVerResena(turno: any): boolean {
    return !!(turno.comentario_especialista || turno.diagnostico);
  }

  // Acciones de turnos
  async aceptarTurno(turno: any) {
    try {
      await this.dbService.aceptarTurno(turno.id);
      await this.cargarTurnos();
      if (this.filtro) {
        await this.aplicarFiltro();
      }
    } catch (error) {
      console.error('Error al aceptar turno:', error);
      alert('Error al aceptar el turno. Inténtelo nuevamente.');
    }
  }

  // Modales
  abrirModalCancelar(turno: any) {
    this.turnoSeleccionado = turno;
    this.comentarioCancelacion = '';
    this.mostrarModalCancelar = true;
  }

  abrirModalRechazar(turno: any) {
    this.turnoSeleccionado = turno;
    this.comentarioRechazo = '';
    this.mostrarModalRechazar = true;
  }

  abrirModalFinalizar(turno: any) {
    this.turnoSeleccionado = turno;
    this.resenaConsulta = '';
    this.diagnostico = '';
    this.mostrarModalFinalizar = true;
  }

  abrirModalResena(turno: any) {
    this.turnoSeleccionado = turno;
    this.mostrarModalResena = true;
  }

  async confirmarCancelacion() {
    if (!this.comentarioCancelacion.trim()) {
      alert('Debe ingresar un comentario para cancelar el turno');
      return;
    }

    try {
      await this.dbService.cancelarTurno(this.turnoSeleccionado.id, this.comentarioCancelacion);
      this.cerrarModales();
      await this.cargarTurnos();
      if (this.filtro) {
        await this.aplicarFiltro();
      }
    } catch (error) {
      console.error('Error al cancelar turno:', error);
      alert('Error al cancelar el turno. Inténtelo nuevamente.');
    }
  }

  async confirmarRechazo() {
    if (!this.comentarioRechazo.trim()) {
      alert('Debe ingresar un comentario para rechazar el turno');
      return;
    }

    try {
      await this.dbService.rechazarTurno(this.turnoSeleccionado.id, this.comentarioRechazo);
      this.cerrarModales();
      await this.cargarTurnos();
      if (this.filtro) {
        await this.aplicarFiltro();
      }
    } catch (error) {
      console.error('Error al rechazar turno:', error);
      alert('Error al rechazar el turno. Inténtelo nuevamente.');
    }
  }

  async confirmarFinalizacion() {
    if (!this.resenaConsulta.trim() || !this.diagnostico.trim()) {
      alert('Debe completar tanto la reseña como el diagnóstico');
      return;
    }

    try {
      await this.dbService.finalizarTurno(
        this.turnoSeleccionado.id, 
        this.resenaConsulta, 
        this.diagnostico
      );
      this.cerrarModales();
      await this.cargarTurnos();
      if (this.filtro) {
        await this.aplicarFiltro();
      }
    } catch (error) {
      console.error('Error al finalizar turno:', error);
      alert('Error al finalizar el turno. Inténtelo nuevamente.');
    }
  }

  cerrarModales() {
    this.mostrarModalCancelar = false;
    this.mostrarModalRechazar = false;
    this.mostrarModalFinalizar = false;
    this.mostrarModalResena = false;
    this.turnoSeleccionado = null;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR');
  }

  formatearHora(hora: string): string {
    if (!hora) return '';
    return hora.substring(0, 5);
  }

  obtenerClaseEstado(estado: string): string {
    if (!estado) return 'estado-default';
    
    switch(estado.toLowerCase()) {
      case 'pendiente': return 'estado-pendiente';
      case 'aceptado': return 'estado-aceptado';
      case 'rechazado': return 'estado-rechazado';
      case 'cancelado': return 'estado-cancelado';
      case 'finalizado': return 'estado-finalizado';
      case 'realizado': return 'estado-realizado';
      default: return 'estado-default';
    }
  }

  obtenerTextoEstado(estado: string): string {
    if (!estado) return 'Sin estado';
    
    switch(estado.toLowerCase()) {
      case 'pendiente': return 'Pendiente';
      case 'aceptado': return 'Aceptado';
      case 'rechazado': return 'Rechazado';
      case 'cancelado': return 'Cancelado';
      case 'finalizado': return 'Finalizado';
      case 'realizado': return 'Realizado';
      default: return estado;
    }
  }
}