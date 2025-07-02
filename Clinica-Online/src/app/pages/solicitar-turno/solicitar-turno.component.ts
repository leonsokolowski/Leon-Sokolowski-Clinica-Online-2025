import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Especialista, Paciente, Usuario } from '../../clases/usuario';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { HorarioFormatoPipe } from '../../pipes/horario-formato.pipe';
import { FechaCompletaPipe } from '../../pipes/fecha-completa.pipe';
import { HighlightHoverDirective } from '../../directives/highlight-hover.directive';

interface TurnoInfo {
  especialidad: string;
  paciente: Usuario;
  especialista: Especialista;
  fecha: string;
  hora: string;
}

@Component({
  selector: 'app-solicitar-turno',
  standalone: true,
  imports: [CommonModule, HorarioFormatoPipe, FechaCompletaPipe, HighlightHoverDirective],
  templateUrl: './solicitar-turno.component.html',
  styleUrls: ['./solicitar-turno.component.css'],
})
export class SolicitarTurnoComponent implements OnInit {
  private dbService = inject(DatabaseService);
  private authService = inject(AuthService);

  // Estados del componente
  pasoActual: number = 1; // 1: Especialidades, 2: Especialistas, 3: Fechas, 4: Horarios, 5: Confirmación, 6: Resultado
  especialidades: string[] = [];
  especialistas: Especialista[] = [];
  fechasDisponibles: string[] = [];
  horariosDisponibles: string[] = [];
  pacientes: Paciente[] = []; // Solo para administradores
  preparandoConfirmacion: boolean = false;

  // Selecciones del usuario
  especialidadSeleccionada: string = '';
  especialistaSeleccionado: Especialista | null = null;
  fechaSeleccionada: string = '';
  horarioSeleccionado: string = '';
  pacienteSeleccionado: Paciente | null = null;

  // Estados de carga
  cargandoEspecialidades: boolean = false;
  cargandoEspecialistas: boolean = false;
  cargandoFechas: boolean = false;
  cargandoHorarios: boolean = false;
  cargandoPacientes: boolean = false;
  creandoTurno: boolean = false;

  // Información del turno para confirmación
  turnoInfo: TurnoInfo | null = null;

  // Mensajes de error
  mensajeError: string = '';

  // Estado del resultado (para paso 6)
  resultado: {
    exitoso: boolean;
    mensaje: string;
  } | null = null;

  // Mapeo de imágenes de especialidades
  imagenesEspecialidades: { [key: string]: string } = {
    cardiología: 'assets/especialidades/cardiologia.png',
    dermatología: 'assets/especialidades/dermatologia.png',
    endocrinología: 'assets/especialidades/endocrinologia.png',
    gastroenterología: 'assets/especialidades/gastroenterologia.png',
    ginecología: 'assets/especialidades/ginecologia.png',
    neurología: 'assets/especialidades/neurologia.png',
    oftalmología: 'assets/especialidades/oftalmologia.png',
    oncología: 'assets/especialidades/oncologia.png',
    ortopedía: 'assets/especialidades/ortopedia.png',
    otorrinolaringología: 'assets/especialidades/otorrinolaringologia.png',
    pediatría: 'assets/especialidades/pediatria.png',
    psiquiatría: 'assets/especialidades/psiquiatria.png',
    traumatología: 'assets/especialidades/traumatologia.png',
    urología: 'assets/especialidades/urologia.png',
  };

  // Verificar si el usuario es administrador
  get esAdministrador(): boolean {
    return this.authService.perfilUsuario === 'admin';
  }

  // Usuario actual
  get usuarioActual(): any {
    return this.authService.usuarioActual;
  }

  ngOnInit() {
    this.cargarEspecialidades();
    if (this.esAdministrador) {
      this.cargarPacientes();
    }
  }

  // Cargar especialidades disponibles
  async cargarEspecialidades() {
    try {
      this.cargandoEspecialidades = true;
      this.mensajeError = '';
      this.especialidades = await this.dbService.obtenerEspecialidades();
    } catch (error) {
      console.error('Error al cargar especialidades:', error);
      this.mensajeError = 'Error al cargar las especialidades disponibles';
    } finally {
      this.cargandoEspecialidades = false;
    }
  }

  // Cargar lista de pacientes (solo para administradores)
  async cargarPacientes() {
    try {
      this.cargandoPacientes = true;
      this.pacientes = await this.dbService.obtenerPacientes();
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
      this.mensajeError = 'Error al cargar la lista de pacientes';
    } finally {
      this.cargandoPacientes = false;
    }
  }

  // Seleccionar especialidad
  async seleccionarEspecialidad(especialidad: string) {
    this.especialidadSeleccionada = especialidad;
    this.pasoActual = 2;
    this.mensajeError = '';

    try {
      this.cargandoEspecialistas = true;
      this.especialistas =
        await this.dbService.obtenerEspecialistasPorEspecialidad(especialidad);
    } catch (error) {
      console.error('Error al cargar especialistas:', error);
      this.mensajeError = 'Error al cargar los especialistas disponibles';
    } finally {
      this.cargandoEspecialistas = false;
    }
  }

  // Seleccionar especialista
  async seleccionarEspecialista(especialista: Especialista) {
    this.especialistaSeleccionado = especialista;
    console.log('Especialista seleccionado:', especialista);
    console.log('Especialidad seleccionada:', this.especialidadSeleccionada);

    // Debug
    await this.debugHorariosEspecialista(especialista);

    this.pasoActual = 3;
    this.mensajeError = '';

    try {
      this.cargandoFechas = true;
      this.fechasDisponibles = await this.dbService.obtenerDiasDisponibles(
        especialista.id!,
        this.especialidadSeleccionada
      );
      console.log('Fechas disponibles obtenidas:', this.fechasDisponibles);
    } catch (error) {
      console.error('Error al cargar fechas:', error);
      this.mensajeError = 'Error al cargar las fechas disponibles';
    } finally {
      this.cargandoFechas = false;
    }
  }

  // Seleccionar fecha
  async seleccionarFecha(fecha: string) {
    this.fechaSeleccionada = fecha;
    this.pasoActual = 4;
    this.mensajeError = '';

    try {
      this.cargandoHorarios = true;
      this.horariosDisponibles =
        await this.dbService.obtenerHorariosDisponibles(
          this.especialistaSeleccionado!.id!,
          this.especialidadSeleccionada,
          fecha
        );
    } catch (error) {
      console.error('Error al cargar horarios:', error);
      this.mensajeError = 'Error al cargar los horarios disponibles';
    } finally {
      this.cargandoHorarios = false;
    }
  }

  // Seleccionar horario
  async seleccionarHorario(horario: string) {
    this.horarioSeleccionado = horario;
    this.preparandoConfirmacion = true;

    try {
      await this.prepararConfirmacion();
      this.pasoActual = 5;
    } catch (error) {
      console.error('Error preparando confirmación:', error);
      this.mensajeError = 'Error al preparar la confirmación del turno';
    } finally {
      this.preparandoConfirmacion = false;
    }
  }

  // Seleccionar paciente (solo para administradores)
  seleccionarPaciente(paciente: Paciente) {
    this.pacienteSeleccionado = paciente;
  }

  // Preparar información para confirmación
  private async prepararConfirmacion() {
    let paciente: Paciente;

    if (this.esAdministrador) {
      paciente = this.pacienteSeleccionado!;
    } else {
      // Obtener datos completos del paciente actual desde la base de datos
      try {
        const pacienteCompleto = await this.dbService.obtenerUsuarioPorEmail(
          this.usuarioActual.email
        );
        if (!pacienteCompleto) {
          throw new Error('No se pudieron obtener los datos del paciente');
        }
        paciente = pacienteCompleto as Paciente;
      } catch (error) {
        console.error('Error al obtener datos del paciente:', error);
        throw error;
      }
    }

    this.turnoInfo = {
      especialidad: this.especialidadSeleccionada,
      paciente: paciente,
      especialista: this.especialistaSeleccionado!,
      fecha: this.fechaSeleccionada,
      hora: this.horarioSeleccionado,
    };
  }

  // Confirmar y crear turno
  async confirmarTurno() {
    if (!this.turnoInfo) return;

    // Validar que se haya seleccionado paciente si es admin
    if (this.esAdministrador && !this.pacienteSeleccionado) {
      this.mensajeError =
        'Debe seleccionar un paciente antes de confirmar el turno';
      return;
    }

    try {
      this.creandoTurno = true;
      this.mensajeError = '';

      // Obtener ID del paciente
      let pacienteId: number;
      if (this.esAdministrador) {
        pacienteId = this.pacienteSeleccionado!.id!;
      } else {
        // Obtener datos del paciente actual
        const pacienteActual = await this.dbService.obtenerUsuarioPorEmail(
          this.usuarioActual.email
        );
        pacienteId = pacienteActual!.id!;
      }

      await this.dbService.crearTurno({
        paciente_id: pacienteId,
        especialista_id: this.especialistaSeleccionado!.id!,
        especialidad: this.especialidadSeleccionada,
        fecha: this.fechaSeleccionada,
        hora: this.horarioSeleccionado,
        estado: 'creado',
      });

      // Configurar resultado exitoso y avanzar al paso 6
      this.resultado = {
        exitoso: true,
        mensaje: '¡Turno creado exitosamente!',
      };
      this.pasoActual = 6;
    } catch (error) {
      console.error('Error al crear turno:', error);

      // Configurar resultado de error y avanzar al paso 6
      this.resultado = {
        exitoso: false,
        mensaje: 'Error al crear el turno. Por favor intente nuevamente.',
      };
      this.pasoActual = 6;
    } finally {
      this.creandoTurno = false;
    }
  }

  // Volver al paso anterior
  volverAtras() {
    if (this.pasoActual > 1) {
      this.pasoActual--;
      this.mensajeError = '';

      // Limpiar selecciones según el paso
      switch (this.pasoActual) {
        case 1:
          this.especialidadSeleccionada = '';
          this.especialistas = [];
          break;
        case 2:
          this.especialistaSeleccionado = null;
          this.fechasDisponibles = [];
          break;
        case 3:
          this.fechaSeleccionada = '';
          this.horariosDisponibles = [];
          break;
        case 4:
          this.horarioSeleccionado = '';
          this.turnoInfo = null;
          break;
      }
    }
  }

  // Reiniciar formulario completamente
  reiniciarFormulario() {
    this.pasoActual = 1;
    this.especialidadSeleccionada = '';
    this.especialistaSeleccionado = null;
    this.fechaSeleccionada = '';
    this.horarioSeleccionado = '';
    this.pacienteSeleccionado = null;
    this.turnoInfo = null;
    this.mensajeError = '';
    this.preparandoConfirmacion = false;
    this.resultado = null; // Limpiar resultado
    this.especialistas = [];
    this.fechasDisponibles = [];
    this.horariosDisponibles = [];
  }

  // ===============================
  // MÉTODOS AUXILIARES MOVIDOS DESDE EL SERVICE
  // ===============================

  // Obtener imagen de especialidad
  obtenerImagenEspecialidad(especialidad: string): string {
    return (
      this.imagenesEspecialidades[especialidad.toLowerCase()] ||
      'assets/especialidades/default.png'
    );
  }
  
  // Método para debug - mostrar todos los horarios del especialista
  async debugHorariosEspecialista(especialista: Especialista) {
    console.log('=== DEBUG HORARIOS ESPECIALISTA ===');
    console.log('Especialista seleccionado:', especialista);

    try {
      const todosLosHorarios = await this.dbService.obtenerTodosLosHorarios(
        especialista.id!
      );
      console.log('Todos los horarios del especialista:', todosLosHorarios);

      // Filtrar por especialidad seleccionada
      const horariosPorEspecialidad = todosLosHorarios.filter(
        (h) => h.especialidad === this.especialidadSeleccionada
      );
      console.log(
        'Horarios para la especialidad seleccionada:',
        horariosPorEspecialidad
      );
    } catch (error) {
      console.error('Error en debug:', error);
    }
  }
}
