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
  filtroEstado: string = '';
  cargando: boolean = false;
  especialistaId: number = 0;
  usuarioActual: any = null;

  // Estados disponibles para filtrar
  estadosDisponibles = [
    { valor: '', texto: 'Todos' },
    { valor: 'creado', texto: 'Creado' },
    { valor: 'aceptado', texto: 'Aceptado' },
    { valor: 'cancelado', texto: 'Cancelado' },
    { valor: 'finalizado', texto: 'Finalizado' }
  ];

  // Variables para modales
  mostrarModalCancelar: boolean = false;
  mostrarModalRechazar: boolean = false;
  mostrarModalFinalizar: boolean = false;
  mostrarModalResena: boolean = false;
  mostrarModalDiagnostico: boolean = false;
  mostrarModalMotivoCancelacion: boolean = false;
  
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
      this.aplicarFiltros();
      console.log('Turnos cargados:', this.turnos);
    } catch (error) {
      console.error('Error al cargar turnos:', error);
    } finally {
      this.cargando = false;
    }
  }

  // Método para normalizar texto (sin tildes y en minúsculas)
  private normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Elimina tildes
  }

  aplicarFiltros() {
    let turnosFiltrados = [...this.turnos];

    // Filtro por texto (especialidad o paciente)
    if (this.filtro.trim()) {
      const filtroNormalizado = this.normalizarTexto(this.filtro.trim());
      
      turnosFiltrados = turnosFiltrados.filter(turno => {
        const especialidad = this.normalizarTexto(turno.especialidad || '');
        const nombrePaciente = this.normalizarTexto(turno.paciente?.nombre || '');
        const apellidoPaciente = this.normalizarTexto(turno.paciente?.apellido || '');
        const nombreCompleto = `${nombrePaciente} ${apellidoPaciente}`.trim();
        
        return especialidad.includes(filtroNormalizado) || 
               nombreCompleto.includes(filtroNormalizado) ||
               nombrePaciente.includes(filtroNormalizado) ||
               apellidoPaciente.includes(filtroNormalizado);
      });
    }

    // Filtro por estado
    if (this.filtroEstado) {
      turnosFiltrados = turnosFiltrados.filter(turno => {
        const estadoTurno = this.normalizarEstado(turno.estado);
        return estadoTurno === this.filtroEstado;
      });
    }

    this.turnosFiltrados = turnosFiltrados;
  }

  // Normalizar estado para comparación
  private normalizarEstado(estado: string): string {
    if (!estado) return 'creado'; // Por defecto creado si no tiene estado
    
    const estadoLower = estado.toLowerCase();
    
    // Mapear estados similares
    switch(estadoLower) {
      case 'pendiente':
        return 'creado';
      case 'rechazado':
        return 'cancelado';
      default:
        return estadoLower;
    }
  }

  limpiarFiltro() {
    this.filtro = '';
    this.aplicarFiltros();
  }

  filtrarPorEstado(estado: string) {
    this.filtroEstado = estado;
    this.aplicarFiltros();
  }

  // Métodos para verificar qué acciones mostrar según los estados
  puedeAceptar(turno: any): boolean {
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'creado';
  }

  puedeRechazar(turno: any): boolean {
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'creado';
  }

  puedeCancelar(turno: any): boolean {
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'aceptado';
  }

  puedeFinalizar(turno: any): boolean {
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'aceptado';
  }

  puedeVerDiagnostico(turno: any): boolean {
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'finalizado' && !!(turno.comentario_especialista || turno.diagnostico);
  }

  puedeVerMotivoCancelacion(turno: any): boolean {
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'cancelado' && !!(turno.comentario_cancelacion || turno.comentario_rechazo);
  }

  // Acciones de turnos
  async aceptarTurno(turno: any) {
    try {
      await this.dbService.aceptarTurno(turno.id);
      await this.cargarTurnos();
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

  abrirModalDiagnostico(turno: any) {
    this.turnoSeleccionado = turno;
    this.mostrarModalDiagnostico = true;
  }

  abrirModalMotivoCancelacion(turno: any) {
    this.turnoSeleccionado = turno;
    this.mostrarModalMotivoCancelacion = true;
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
    this.mostrarModalDiagnostico = false;
    this.mostrarModalMotivoCancelacion = false;
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
    const estadoNormalizado = this.normalizarEstado(estado);
    
    switch(estadoNormalizado) {
      case 'creado': return 'estado-creado';
      case 'aceptado': return 'estado-aceptado';
      case 'cancelado': return 'estado-cancelado';
      case 'finalizado': return 'estado-finalizado';
      default: return 'estado-default';
    }
  }

  obtenerTextoEstado(estado: string): string {
    const estadoNormalizado = this.normalizarEstado(estado);
    
    switch(estadoNormalizado) {
      case 'creado': return 'Creado';
      case 'aceptado': return 'Aceptado';
      case 'cancelado': return 'Cancelado';
      case 'finalizado': return 'Finalizado';
      default: return 'Sin estado';
    }
  }
}