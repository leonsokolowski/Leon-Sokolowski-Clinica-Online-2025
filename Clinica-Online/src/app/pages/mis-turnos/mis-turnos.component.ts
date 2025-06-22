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
  usuarioId: number = 0;
  usuarioActual: any = null;
  esPaciente: boolean = false;
  esEspecialista: boolean = false;

  altura: number = 0;
  peso: number = 0;
  temperatura: number = 0;
  presion: string = '';

  // Datos dinámicos (máximo 3)
  datosDinamicos: any = {};
  nuevoClave: string = '';
  nuevoValor: string = '';

  // Estados disponibles para filtrar
  estadosDisponibles = [
    { valor: '', texto: 'Todos' },
    { valor: 'creado', texto: 'Pendiente' },
    { valor: 'aceptado', texto: 'Aceptado' },
    { valor: 'cancelado', texto: 'Cancelado' },
    { valor: 'rechazado', texto: 'Rechazado' },
    { valor: 'finalizado', texto: 'Finalizado' }
  ];

  // Variables para modales
  mostrarModalCancelar: boolean = false;
  mostrarModalRechazar: boolean = false;
  mostrarModalFinalizar: boolean = false;
  mostrarModalResena: boolean = false;
  mostrarModalDiagnostico: boolean = false;
  mostrarModalMotivoCancelacion: boolean = false;
  mostrarModalEncuesta: boolean = false;
  mostrarModalCalificar: boolean = false;
  
  turnoSeleccionado: any = null;
  comentarioCancelacion: string = '';
  comentarioRechazo: string = '';
  resenaConsulta: string = '';
  diagnostico: string = '';
  puntajeAtencion: number = 0;
  
  // Variables para encuesta
  encuesta = {
    atencion_recibida: '',
    tiempo_espera: '',
    instalaciones: '',
    recomendaria: '',
    comentarios: ''
  };

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

      // Establecemos el tipo de usuario
      this.esPaciente = this.usuarioActual.perfil === 'paciente';
      this.esEspecialista = this.usuarioActual.perfil === 'especialista';
      
      if (this.esPaciente || this.esEspecialista) {
        this.usuarioId = this.usuarioActual.id;
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
    return this.usuarioActual && (this.esPaciente || this.esEspecialista);
  }

  async cargarTurnos() {
  if (!this.usuarioId) return;
  
  try {
    this.cargando = true;
    
    if (this.esPaciente) {
      this.turnos = await this.dbService.obtenerTurnosConDetalles('paciente', this.usuarioId);
    } else if (this.esEspecialista) {
      this.turnos = await this.dbService.obtenerTurnosConDetalles('especialista', this.usuarioId);
    }
    
    this.aplicarFiltros();
    console.log('Turnos cargados:', this.turnos);
  } catch (error) {
    console.error('Error al cargar turnos:', error);
  } finally {
    this.cargando = false;
  }
}
async recargarDatosTurno(turnoId: number) {
  try {
    // Cambiar obtenerTurnoCompleto por el nuevo método
    const turnoCompleto = await this.dbService.obtenerTurnoCompleto(turnoId);
    
    if (turnoCompleto) {
      // Actualizar el turno en la lista
      const index = this.turnos.findIndex(t => t.id === turnoId);
      if (index !== -1) {
        this.turnos[index] = turnoCompleto;
        this.aplicarFiltros();
      }
    }
  } catch (error) {
    console.error('Error al recargar datos del turno:', error);
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

  // Método para buscar en datos de historia clínica
  private buscarEnHistoriaClinica(turno: any, filtroNormalizado: string): boolean {
    if (!turno) return false;
    
    // Buscar en datos estáticos de historia clínica
    const datosEstaticos = [
      turno.altura_cm?.toString() || '',
      turno.peso_kg?.toString() || '',
      turno.temperatura_c?.toString() || '',
      turno.presion_arterial || ''
    ];
    
    // Verificar si algún dato estático coincide
    const coincideEstatico = datosEstaticos.some(dato => 
      this.normalizarTexto(dato).includes(filtroNormalizado)
    );
    
    if (coincideEstatico) return true;
    
    // Buscar en datos dinámicos (solo valores, no claves)
    if (turno.datos_dinamicos) {
      try {
        const datosDinamicos = typeof turno.datos_dinamicos === 'string' 
          ? JSON.parse(turno.datos_dinamicos) 
          : turno.datos_dinamicos;
        
        if (datosDinamicos && typeof datosDinamicos === 'object') {
          const valoresDinamicos = Object.values(datosDinamicos);
          const coincideDinamico = valoresDinamicos.some(valor => 
            this.normalizarTexto(valor?.toString() || '').includes(filtroNormalizado)
          );
          
          if (coincideDinamico) return true;
        }
      } catch (error) {
        console.error('Error al parsear datos dinámicos:', error);
      }
    }
    
    return false;
  }

  aplicarFiltros() {
    let turnosFiltrados = [...this.turnos];

    // Filtro por texto
    if (this.filtro.trim()) {
      const filtroNormalizado = this.normalizarTexto(this.filtro.trim());
      
      turnosFiltrados = turnosFiltrados.filter(turno => {
        const especialidad = this.normalizarTexto(turno.especialidad || '');
        
        // Buscar en datos básicos del turno
        let coincideBasico = false;
        
        if (this.esPaciente) {
          // Para paciente: filtrar por especialidad o especialista
          const nombreEspecialista = this.normalizarTexto(turno.especialista?.nombre || '');
          const apellidoEspecialista = this.normalizarTexto(turno.especialista?.apellido || '');
          const nombreCompletoEspecialista = `${nombreEspecialista} ${apellidoEspecialista}`.trim();
          
          coincideBasico = especialidad.includes(filtroNormalizado) || 
                          nombreCompletoEspecialista.includes(filtroNormalizado) ||
                          nombreEspecialista.includes(filtroNormalizado) ||
                          apellidoEspecialista.includes(filtroNormalizado);
        } else {
          // Para especialista: filtrar por especialidad o paciente
          const nombrePaciente = this.normalizarTexto(turno.paciente?.nombre || '');
          const apellidoPaciente = this.normalizarTexto(turno.paciente?.apellido || '');
          const nombreCompletoPaciente = `${nombrePaciente} ${apellidoPaciente}`.trim();
          
          coincideBasico = especialidad.includes(filtroNormalizado) || 
                          nombreCompletoPaciente.includes(filtroNormalizado) ||
                          nombrePaciente.includes(filtroNormalizado) ||
                          apellidoPaciente.includes(filtroNormalizado);
        }
        
        // Buscar también en diagnóstico y comentario del especialista
        const diagnostico = this.normalizarTexto(turno.diagnostico || '');
        const comentarioEspecialista = this.normalizarTexto(turno.comentario_especialista || '');
        const coincideDiagnostico = diagnostico.includes(filtroNormalizado) || 
                                   comentarioEspecialista.includes(filtroNormalizado);
        
        // Buscar en datos de historia clínica
        const coincideHistoria = this.buscarEnHistoriaClinica(turno, filtroNormalizado);
        
        return coincideBasico || coincideDiagnostico || coincideHistoria;
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
    if (!estado) return 'creado';
    return estado.toLowerCase();
  }

  limpiarFiltro() {
    this.filtro = '';
    this.aplicarFiltros();
  }

  filtrarPorEstado(estado: string) {
    this.filtroEstado = estado;
    this.aplicarFiltros();
  }

  // === MÉTODOS PARA VERIFICAR ACCIONES SEGÚN PERFIL ===

  // Para PACIENTE
  puedeCancelarPaciente(turno: any): boolean {
    if (!this.esPaciente) return false;
    const estado = this.normalizarEstado(turno.estado);
    return ['creado', 'aceptado'].includes(estado);
  }

  // CAMBIO 1: Método unificado para ver diagnóstico (tanto paciente como especialista)
  puedeVerDiagnostico(turno: any): boolean {
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'finalizado' && !!(turno.comentario_especialista || turno.diagnostico);
  }

  // Mantenemos el método original para compatibilidad
  puedeVerResena(turno: any): boolean {
    return this.puedeVerDiagnostico(turno);
  }

  puedeCompletarEncuesta(turno: any): boolean {
    if (!this.esPaciente) return false;
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'finalizado' && !turno.encuesta && !!(turno.comentario_especialista || turno.diagnostico);
  }

  puedeCalificarAtencion(turno: any): boolean {
    if (!this.esPaciente) return false;
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'finalizado' && !turno.puntaje;
  }

  // Para ESPECIALISTA
  puedeAceptar(turno: any): boolean {
    if (!this.esEspecialista) return false;
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'creado';
  }

  puedeRechazar(turno: any): boolean {
    if (!this.esEspecialista) return false;
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'creado';
  }

  puedeCancelarEspecialista(turno: any): boolean {
    if (!this.esEspecialista) return false;
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'aceptado';
  }

  puedeFinalizar(turno: any): boolean {
    if (!this.esEspecialista) return false;
    const estado = this.normalizarEstado(turno.estado);
    return estado === 'aceptado';
  }

  puedeVerMotivoCancelacion(turno: any): boolean {
    const estado = this.normalizarEstado(turno.estado);
    return ['cancelado', 'rechazado'].includes(estado) && !!(turno.comentario_cancelacion || turno.comentario_rechazo);
  }

  // === ACCIONES DE TURNOS ===

  async aceptarTurno(turno: any) {
    try {
      await this.dbService.aceptarTurno(turno.id);
      await this.cargarTurnos();
    } catch (error) {
      console.error('Error al aceptar turno:', error);
      alert('Error al aceptar el turno. Inténtelo nuevamente.');
    }
  }

  // === MODALES PARA PACIENTE ===

  abrirModalEncuesta(turno: any) {
    this.turnoSeleccionado = turno;
    this.encuesta = {
      atencion_recibida: '',
      tiempo_espera: '',
      instalaciones: '',
      recomendaria: '',
      comentarios: ''
    };
    this.mostrarModalEncuesta = true;
  }

  abrirModalCalificar(turno: any) {
    this.turnoSeleccionado = turno;
    this.puntajeAtencion = 0;
    this.mostrarModalCalificar = true;
  }

  async confirmarEncuesta() {
    if (!this.encuesta.atencion_recibida || !this.encuesta.tiempo_espera || !this.encuesta.instalaciones || !this.encuesta.recomendaria) {
      alert('Debe completar todos los campos obligatorios de la encuesta');
      return;
    }

    try {
      await this.dbService.completarEncuesta(this.turnoSeleccionado.id, this.encuesta);
      this.cerrarModales();
      await this.cargarTurnos();
    } catch (error) {
      console.error('Error al completar encuesta:', error);
      alert('Error al completar la encuesta. Inténtelo nuevamente.');
    }
  }

  async confirmarCalificacion() {
    if (!this.puntajeAtencion) {
      alert('Debe ingresar una puntuación');
      return;
    }

    try {
      await this.dbService.calificarAtencion(this.turnoSeleccionado.id, this.puntajeAtencion, '');
      this.cerrarModales();
      await this.cargarTurnos();
    } catch (error) {
      console.error('Error al calificar atención:', error);
      alert('Error al calificar la atención. Inténtelo nuevamente.');
    }
  }

  agregarDatoDinamico() {
    if (!this.nuevoClave.trim() || !this.nuevoValor.trim()) {
      alert('Debe completar tanto la clave como el valor');
      return;
    }

    if (Object.keys(this.datosDinamicos).length >= 3) {
      alert('No se pueden agregar más de 3 datos dinámicos');
      return;
    }

    if (this.datosDinamicos.hasOwnProperty(this.nuevoClave.trim())) {
      alert('Ya existe un dato con esa clave');
      return;
    }

    this.datosDinamicos[this.nuevoClave.trim()] = this.nuevoValor.trim();
    this.nuevoClave = '';
    this.nuevoValor = '';
  }

  eliminarDatoDinamico(clave: string) {
    delete this.datosDinamicos[clave];
  }

  obtenerClavesDatosDinamicos(): string[] {
    return Object.keys(this.datosDinamicos);
  }

  puedeAgregarMasDatos(): boolean {
    return Object.keys(this.datosDinamicos).length < 3;
  }

  // === MODALES COMUNES ===

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
    
    // Limpiar datos de historia clínica
    this.altura = 0;
    this.peso = 0;
    this.temperatura = 0;
    this.presion = '';
    this.datosDinamicos = {};
    this.nuevoClave = '';
    this.nuevoValor = '';
    
    this.mostrarModalFinalizar = true;
  }

  // CAMBIO 2: Método unificado para abrir modal de diagnóstico
  abrirModalDiagnostico(turno: any) {
    this.turnoSeleccionado = turno;
    this.mostrarModalDiagnostico = true;
  }

  // Mantenemos el método original para compatibilidad
  abrirModalResena(turno: any) {
    this.abrirModalDiagnostico(turno);
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
    // Validar campos obligatorios
    if (!this.resenaConsulta.trim() || !this.diagnostico.trim()) {
      alert('Debe completar tanto la reseña como el diagnóstico');
      return;
    }

    // Validar datos de historia clínica
    if (!this.altura || !this.peso || !this.temperatura || !this.presion.trim()) {
      alert('Debe completar todos los datos de historia clínica (altura, peso, temperatura y presión)');
      return;
    }

    // Validar rangos de datos
    if (this.altura < 50 || this.altura > 250) {
      alert('La altura debe estar entre 50 y 250 cm');
      return;
    }

    if (this.peso < 1 || this.peso > 500) {
      alert('El peso debe estar entre 1 y 500 kg');
      return;
    }

    if (this.temperatura < 30 || this.temperatura > 45) {
      alert('La temperatura debe estar entre 30 y 45°C');
      return;
    }

    try {
      await this.dbService.finalizarTurno({
        turnoId: this.turnoSeleccionado.id,
        resena: this.resenaConsulta,
        diagnostico: this.diagnostico,
        altura_cm: this.altura,
        peso_kg: this.peso,
        temperatura_c: this.temperatura,
        presion_arterial: this.presion,
        datos_dinamicos: this.datosDinamicos
      });
      
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
    this.mostrarModalEncuesta = false;
    this.mostrarModalCalificar = false;
    this.turnoSeleccionado = null;
  }

  // === MÉTODOS DE UTILIDAD ===

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
      case 'creado': return 'estado-pendiente';
      case 'aceptado': return 'estado-aceptado';
      case 'cancelado': return 'estado-cancelado';
      case 'rechazado': return 'estado-rechazado';
      case 'finalizado': return 'estado-finalizado';
      default: return 'estado-default';
    }
  }

  obtenerTextoEstado(estado: string): string {
    const estadoNormalizado = this.normalizarEstado(estado);
    
    switch(estadoNormalizado) {
      case 'creado': return 'Pendiente';
      case 'aceptado': return 'Aceptado';
      case 'cancelado': return 'Cancelado';
      case 'rechazado': return 'Rechazado';
      case 'finalizado': return 'Finalizado';
      default: return 'Sin estado';
    }
  }

  obtenerEstrellasArray(puntaje: number): number[] {
    return Array(5).fill(0).map((_, i) => i + 1);
  }

  // CAMBIO 2: Métodos auxiliares para mostrar datos de historia clínica en el modal
  obtenerDatosDinamicosComoObjeto(turno: any): any {
    if (!turno.datos_dinamicos) return {};
    
    try {
      return typeof turno.datos_dinamicos === 'string' 
        ? JSON.parse(turno.datos_dinamicos) 
        : turno.datos_dinamicos;
    } catch (error) {
      console.error('Error al parsear datos dinámicos:', error);
      return {};
    }
  }

  obtenerClavesDatosDinamicosTurno(turno: any): string[] {
    const datos = this.obtenerDatosDinamicosComoObjeto(turno);
    return Object.keys(datos);
  }

  tieneHistoriaClinica(turno: any): boolean {
    return !!(turno.altura_cm || turno.peso_kg || turno.temperatura_c || turno.presion_arterial || turno.datos_dinamicos);
  }
}