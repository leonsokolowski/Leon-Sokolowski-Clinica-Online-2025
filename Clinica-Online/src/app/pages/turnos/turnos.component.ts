import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './turnos.component.html',
  styleUrl: './turnos.component.css'
})
export class TurnosComponent implements OnInit {
  databaseService = inject(DatabaseService);
  authService = inject(AuthService);
  // Estado del componente
  cargando = true;
  turnos: any[] = [];
  turnosFiltrados: any[] = [];
  usuarioActual: any = null;
  esAdmin = false;

  // Filtros
  filtro = '';
  
  // Modales
  mostrarModalCancelar = false;
  turnoSeleccionado: any = null;
  comentarioCancelacion = '';

  // Estados disponibles para filtrado
  estadosDisponibles = [
    { valor: '', texto: 'Todos' },
    { valor: 'creado', texto: 'Pendiente' },
    { valor: 'aceptado', texto: 'Aceptado' },
    { valor: 'rechazado', texto: 'Rechazado' },
    { valor: 'cancelado', texto: 'Cancelado' },
    { valor: 'finalizado', texto: 'Finalizado' }
  ];
  filtroEstado = '';

  async ngOnInit() {
    await this.inicializarComponente();
  }

  async inicializarComponente() {
    try {
      this.cargando = true;
      
      // Obtener usuario actual
      this.usuarioActual = await this.authService.obtenerUsuarioActual();
      
      if (this.usuarioActual) {
        this.esAdmin = this.usuarioActual.perfil === 'admin';
        
        if (this.esAdmin) {
          await this.cargarTodosLosTurnos();
        }
      }
    } catch (error) {
      console.error('Error al inicializar componente:', error);
    } finally {
      this.cargando = false;
    }
  }

  // Verificar si el usuario puede ver el componente
  puedeVerComponente(): boolean {
    return this.usuarioActual && this.esAdmin;
  }

  // Cargar todos los turnos de la clínica
  async cargarTodosLosTurnos() {
    try {
      // Obtener todos los turnos con información de paciente y especialista
      const { data, error } = await this.databaseService.sb.supabase
        .from('turnos')
        .select(`
          *,
          paciente:paciente_id (
            nombre,
            apellido,
            obra_social,
            imagen_perfil_1
          ),
          especialista:especialista_id (
            nombre,
            apellido,
            especialidades,
            imagen_perfil_1
          )
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false });

      if (error) {
        console.error('Error al cargar turnos:', error);
        throw error;
      }

      this.turnos = data || [];
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar todos los turnos:', error);
      this.turnos = [];
      this.turnosFiltrados = [];
    }
  }

  // Aplicar filtros
  aplicarFiltros() {
    let turnosFiltrados = [...this.turnos];

    // Filtro por texto (especialidad o especialista)
    if (this.filtro.trim()) {
      const filtroTexto = this.filtro.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      turnosFiltrados = turnosFiltrados.filter(turno => {
        const especialidad = (turno.especialidad || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const nombreEspecialista = (turno.especialista?.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const apellidoEspecialista = (turno.especialista?.apellido || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        return especialidad.includes(filtroTexto) ||
               nombreEspecialista.includes(filtroTexto) ||
               apellidoEspecialista.includes(filtroTexto) ||
               `${nombreEspecialista} ${apellidoEspecialista}`.includes(filtroTexto);
      });
    }

    // Filtro por estado
    if (this.filtroEstado) {
      turnosFiltrados = turnosFiltrados.filter(turno => turno.estado === this.filtroEstado);
    }

    this.turnosFiltrados = turnosFiltrados;
  }

  // Limpiar filtro de texto
  limpiarFiltro() {
    this.filtro = '';
    this.aplicarFiltros();
  }

  // Filtrar por estado
  filtrarPorEstado(estado: string) {
    this.filtroEstado = estado;
    this.aplicarFiltros();
  }

  // Verificar si el admin puede cancelar el turno
  puedeCancelarAdmin(turno: any): boolean {
    // Solo permitir cancelar turnos que están en estado 'creado'
    return turno.estado === 'creado';
  }

  // Abrir modal para cancelar
  abrirModalCancelar(turno: any) {
    this.turnoSeleccionado = turno;
    this.comentarioCancelacion = '';
    this.mostrarModalCancelar = true;
  }

  // Cerrar todos los modales
  cerrarModales() {
    this.mostrarModalCancelar = false;
    this.turnoSeleccionado = null;
    this.comentarioCancelacion = '';
  }

  // Confirmar cancelación
  async confirmarCancelacion() {
    if (!this.turnoSeleccionado || !this.comentarioCancelacion.trim()) {
      return;
    }

    try {
      await this.databaseService.cancelarTurno(
        this.turnoSeleccionado.id,
        this.comentarioCancelacion.trim()
      );

      // Actualizar el turno en la lista local
      const index = this.turnos.findIndex(t => t.id === this.turnoSeleccionado.id);
      if (index !== -1) {
        this.turnos[index].estado = 'cancelado';
        this.turnos[index].comentario_cancelacion = this.comentarioCancelacion.trim();
      }

      this.aplicarFiltros();
      this.cerrarModales();
      
      // Aquí podrías mostrar un mensaje de éxito
      console.log('Turno cancelado exitosamente por administrador');
      
    } catch (error) {
      console.error('Error al cancelar turno:', error);
      // Aquí podrías mostrar un mensaje de error
    }
  }

  // Formatear fecha
  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    
    const fechaObj = new Date(fecha + 'T00:00:00');
    return fechaObj.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Formatear hora
  formatearHora(hora: string): string {
    if (!hora) return '';
    
    const [hours, minutes] = hora.split(':');
    const horaObj = new Date();
    horaObj.setHours(parseInt(hours), parseInt(minutes));
    
    return horaObj.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // Obtener clase CSS para el estado
  obtenerClaseEstado(estado: string): string {
    const clases: { [key: string]: string } = {
      'creado': 'estado-pendiente',
      'aceptado': 'estado-aceptado',
      'rechazado': 'estado-rechazado',
      'cancelado': 'estado-cancelado',
      'finalizado': 'estado-finalizado'
    };
    return clases[estado] || 'estado-default';
  }

  // Obtener texto del estado
  obtenerTextoEstado(estado: string): string {
    const textos: { [key: string]: string } = {
      'creado': 'Pendiente',
      'aceptado': 'Aceptado',
      'rechazado': 'Rechazado',
      'cancelado': 'Cancelado',
      'finalizado': 'Finalizado'
    };
    return textos[estado] || estado;
  }

  // Obtener array de estrellas para mostrar puntuación
  obtenerEstrellasArray(cantidad: number): number[] {
    return Array.from({ length: cantidad }, (_, i) => i + 1);
  }
}