import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Usuario, Paciente, Especialista } from '../../clases/usuario';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';

interface Turno {
  id?: number;
  paciente_id: number;
  especialista_id: number;
  especialidad: string;
  fecha: string;
  hora: string;
  estado: string;
  created_at?: string;
}

interface EspecialidadInfo {
  nombre: string;
  imagen?: string;
  count: number;
}

interface HorarioDisponible {
  dia: string;
  hora_inicio: string;
  hora_final: string;
}

@Component({
  selector: 'app-solicitar-turno',
  imports: [CommonModule],
  templateUrl: './solicitar-turno.component.html',
  styleUrl: './solicitar-turno.component.css'
})
export class SolicitarTurnoComponent implements OnInit {
  
  private db = inject(DatabaseService);
  private auth = inject(AuthService);
  
  // Estado del flujo
  paso: 'especialidades' | 'especialistas' | 'fechas' | 'horarios' | 'confirmacion' = 'especialidades';
  
  // Datos del formulario
  especialidadSeleccionada: string = '';
  especialistaSeleccionado: Especialista | null = null;
  fechaSeleccionada: string = '';
  horaSeleccionada: string = '';
  pacienteSeleccionado: Paciente | null = null;
  
  // Listas de datos
  especialidades: EspecialidadInfo[] = [];
  especialistas: Especialista[] = [];
  fechasDisponibles: string[] = [];
  horariosDisponibles: string[] = [];
  pacientes: Paciente[] = [];
  
  // Usuario actual
  usuarioActual: Usuario | null = null;
  esAdmin: boolean = false;
  
  // Estado de carga
  cargando: boolean = false;
  
  async ngOnInit() {
    await this.inicializar();
  }
  
  private async inicializar() {
    try {
      this.cargando = true;
      
      // Obtener usuario actual desde el AuthService
      if (this.auth.usuarioActual?.email) {
        console.log('Obteniendo usuario por email:', this.auth.usuarioActual.email);
        this.usuarioActual = await this.db.obtenerUsuarioPorEmail(this.auth.usuarioActual.email);
        console.log('Usuario obtenido:', this.usuarioActual);
        this.esAdmin = this.auth.perfilUsuario === 'admin';
        console.log('Es admin:', this.esAdmin);
      }
      
      // Si es admin, cargar lista de pacientes
      if (this.esAdmin) {
        console.log('Cargando pacientes para admin...');
        this.pacientes = await this.db.obtenerPacientes();
        console.log('Pacientes cargados:', this.pacientes.length);
      }
      
      // Cargar especialidades disponibles
      await this.cargarEspecialidades();
      
    } catch (error) {
      console.error('Error al inicializar:', error);
    } finally {
      this.cargando = false;
    }
  }
  
  private async cargarEspecialidades() {
    try {
      // Obtener todos los especialistas habilitados
      const especialistas = await this.db.obtenerEspecialistas();
      const especialistasHabilitados = especialistas.filter(e => e.habilitado);
      
      // Extraer especialidades únicas y contar especialistas por especialidad
      const especialidadesMap = new Map<string, EspecialidadInfo>();
      
      especialistasHabilitados.forEach(especialista => {
        especialista.especialidades.forEach(esp => {
          if (especialidadesMap.has(esp)) {
            especialidadesMap.get(esp)!.count++;
          } else {
            especialidadesMap.set(esp, {
              nombre: esp,
              imagen: this.obtenerImagenEspecialidad(esp),
              count: 1
            });
          }
        });
      });
      
      this.especialidades = Array.from(especialidadesMap.values())
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      
    } catch (error) {
      console.error('Error al cargar especialidades:', error);
    }
  }
  
  private obtenerImagenEspecialidad(especialidad: string): string {
  // Limpiar el nombre de la especialidad
  const especialidadLimpia = especialidad
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/\s+/g, ''); // Remover espacios
  
  // Mapeo de especialidades a imágenes por defecto
  const imagenesEspecialidades: { [key: string]: string } = {
    'cardiologia': 'assets/especialidades/cardiologia.png',
    'dermatologia': 'assets/especialidades/dermatologia.png',
    'endocrinologia': 'assets/especialidades/endocrinologia.png',
    'gastroenterologia': 'assets/especialidades/gastroenterologia.png',
    'ginecologia': 'assets/especialidades/ginecologia.png',
    'neurologia': 'assets/especialidades/neurologia.png',
    'oftalmologia': 'assets/especialidades/oftalmologia.png',
    'oncologia': 'assets/especialidades/oncologia.png',
    'ortopedia': 'assets/especialidades/ortopedia.png',
    'otorrinolaringologia': 'assets/especialidades/otorrinolaringologia.png',
    'pediatria': 'assets/especialidades/pediatria.png',
    'psiquiatria': 'assets/especialidades/psiquiatria.png',
    'traumatologia': 'assets/especialidades/traumatologia.png',
    'urologia': 'assets/especialidades/urologia.png'
  };
  
  const rutaImagen = imagenesEspecialidades[especialidadLimpia] || 'assets/especialidades/default.png';
  
  // Debug: agregar estos console.log temporalmente
  console.log('Especialidad original:', especialidad);
  console.log('Especialidad limpia:', especialidadLimpia);
  console.log('Ruta de imagen generada:', rutaImagen);
  console.log('¿Existe en el mapeo?', imagenesEspecialidades.hasOwnProperty(especialidadLimpia));
  console.log('Claves disponibles:', Object.keys(imagenesEspecialidades));
  
  return rutaImagen;
}
  
  async seleccionarEspecialidad(especialidad: string) {
    try {
      this.cargando = true;
      this.especialidadSeleccionada = especialidad;
      
      // Cargar especialistas de esta especialidad
      await this.cargarEspecialistas();
      
      this.paso = 'especialistas';
      
    } catch (error) {
      console.error('Error al seleccionar especialidad:', error);
    } finally {
      this.cargando = false;
    }
  }
  
  private async cargarEspecialistas() {
    try {
      const todosEspecialistas = await this.db.obtenerEspecialistas();
      
      this.especialistas = todosEspecialistas.filter(especialista => 
        especialista.habilitado && 
        especialista.especialidades.includes(this.especialidadSeleccionada)
      );
      
    } catch (error) {
      console.error('Error al cargar especialistas:', error);
    }
  }
  
  async seleccionarEspecialista(especialista: Especialista) {
    try {
      this.cargando = true;
      console.log('Seleccionando especialista:', especialista);
      this.especialistaSeleccionado = especialista;
      
      // Cargar fechas disponibles
      await this.cargarFechasDisponibles();
      
      this.paso = 'fechas';
      console.log('Especialista seleccionado y fechas cargadas');
      
    } catch (error) {
      console.error('Error al seleccionar especialista:', error);
    } finally {
      this.cargando = false;
    }
  }
  
  private async cargarFechasDisponibles() {
  try {
    if (!this.especialistaSeleccionado?.id) return;
    
    console.log('Cargando fechas para especialista:', this.especialistaSeleccionado.nombreCompleto);
    console.log('Especialidad seleccionada:', this.especialidadSeleccionada);
    
    // Obtener horarios del especialista
    const horarios = await this.db.obtenerHorariosEspecialista(this.especialistaSeleccionado.id);
    
    console.log('Horarios obtenidos:', horarios);
    
    // Filtrar horarios de la especialidad seleccionada
    const horariosEspecialidad = horarios.filter(h => 
      h.especialidad.toLowerCase() === this.especialidadSeleccionada.toLowerCase()
    );
    
    console.log('Horarios filtrados por especialidad:', horariosEspecialidad);
    
    if (horariosEspecialidad.length === 0) {
      console.log('No se encontraron horarios para esta especialidad');
      this.fechasDisponibles = [];
      return;
    }
    
    // Generar fechas de los próximos 15 días
    const fechas: string[] = [];
    const hoy = new Date();
    
    for (let i = 1; i <= 15; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      
      const diaSemana = this.obtenerNombreDia(fecha.getDay());
      
      console.log(`Día ${i}: ${this.formatearFecha(fecha)} - ${diaSemana}`);
      
      // Verificar si el especialista trabaja este día en esta especialidad
      // Comparar de forma case-insensitive
      const tieneHorario = horariosEspecialidad.some(h => 
        h.dia.toLowerCase() === diaSemana.toLowerCase()
      );
      
      console.log(`¿Tiene horario para ${diaSemana}?`, tieneHorario);
      
      if (tieneHorario) {
        fechas.push(this.formatearFecha(fecha));
      }
    }
    
    console.log('Fechas disponibles generadas:', fechas);
    this.fechasDisponibles = fechas;
    
  } catch (error) {
    console.error('Error al cargar fechas disponibles:', error);
  }
}
  
  private obtenerNombreDia(numeroDia: number): string {
  // Cambio importante: usar la primera letra mayúscula para coincidir con la BD
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[numeroDia];
}
  
  private formatearFecha(fecha: Date): string {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    return `${dia}/${mes}`;
  }
  
  async seleccionarFecha(fecha: string) {
    try {
      this.cargando = true;
      this.fechaSeleccionada = fecha;
      
      // Cargar horarios disponibles para esta fecha
      await this.cargarHorariosDisponibles();
      
      this.paso = 'horarios';
      
    } catch (error) {
      console.error('Error al seleccionar fecha:', error);
    } finally {
      this.cargando = false;
    }
  }
  
  private async cargarHorariosDisponibles() {
  try {
    if (!this.especialistaSeleccionado?.id) return;
    
    console.log('Cargando horarios para fecha:', this.fechaSeleccionada);
    
    // Obtener horarios del especialista para la especialidad seleccionada
    const horarios = await this.db.obtenerHorariosEspecialista(this.especialistaSeleccionado.id);
    
    // Convertir fecha seleccionada a nombre del día
    const [dia, mes] = this.fechaSeleccionada.split('/');
    const añoActual = new Date().getFullYear();
    const fechaCompleta = new Date(añoActual, parseInt(mes) - 1, parseInt(dia));
    const nombreDia = this.obtenerNombreDia(fechaCompleta.getDay());
    
    console.log('Día de la semana calculado:', nombreDia);
    
    // Encontrar horario para este día y especialidad (comparación case-insensitive)
    const horarioDelDia = horarios.find(h => 
      h.dia.toLowerCase() === nombreDia.toLowerCase() && 
      h.especialidad.toLowerCase() === this.especialidadSeleccionada.toLowerCase()
    );
    
    console.log('Horario encontrado para el día:', horarioDelDia);
    
    if (horarioDelDia) {
      // Generar slots de 30 minutos
      const slots = this.generarSlotsDeHorario(horarioDelDia.hora_inicio, horarioDelDia.hora_final);
      
      console.log('Slots generados:', slots);
      
      // Filtrar slots ya ocupados
      const slotsDisponibles = await this.filtrarSlotsOcupados(slots, fechaCompleta);
      
      console.log('Slots disponibles después de filtrar:', slotsDisponibles);
      
      this.horariosDisponibles = slotsDisponibles;
    } else {
      console.log('No se encontró horario para este día y especialidad');
      this.horariosDisponibles = [];
    }
    
  } catch (error) {
    console.error('Error al cargar horarios disponibles:', error);
  }
}
  
  private generarSlotsDeHorario(horaInicio: string, horaFinal: string): string[] {
    const slots: string[] = [];
    
    // Convertir horas a minutos
    const [inicioHora, inicioMin] = horaInicio.split(':').map(Number);
    const [finalHora, finalMin] = horaFinal.split(':').map(Number);
    
    const inicioEnMinutos = inicioHora * 60 + inicioMin;
    const finalEnMinutos = finalHora * 60 + finalMin;
    
    // Generar slots cada 30 minutos
    for (let minutos = inicioEnMinutos; minutos < finalEnMinutos; minutos += 30) {
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      
      const horaFormateada = `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(horaFormateada);
    }
    
    return slots;
  }
  
  private async filtrarSlotsOcupados(slots: string[], fecha: Date): Promise<string[]> {
  try {
    // Obtener turnos existentes para este especialista en esta fecha
    const fechaStr = fecha.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Usar el método del service en lugar del método local
    const turnosExistentes = await this.db.obtenerTurnosExistentes(
      this.especialistaSeleccionado!.id!, 
      fechaStr
    );
    
    const horasOcupadas = turnosExistentes.map(t => t.hora);
    
    return slots.filter(slot => !horasOcupadas.includes(slot));
    
  } catch (error) {
    console.error('Error al filtrar slots ocupados:', error);
    return slots;
  }
}
  
  seleccionarHorario(hora: string) {
  this.horaSeleccionada = hora;
  
  // Cambiar al paso de confirmación
  this.paso = 'confirmacion';
}
  
  seleccionarPaciente(paciente: Paciente) {
    console.log('Seleccionando paciente:', paciente);
    this.pacienteSeleccionado = paciente;
    console.log('Paciente seleccionado guardado:', this.pacienteSeleccionado);
  }
  
  async confirmarTurno() {
    try {
      this.cargando = true;
      
      console.log('Iniciando confirmación de turno...');
      console.log('Estado actual:', {
        especialidad: this.especialidadSeleccionada,
        especialista: this.especialistaSeleccionado,
        fecha: this.fechaSeleccionada,
        hora: this.horaSeleccionada,
        esAdmin: this.esAdmin,
        usuarioActual: this.usuarioActual,
        pacienteSeleccionado: this.pacienteSeleccionado
      });
      
      // Validar datos necesarios
      if (!this.especialidadSeleccionada || !this.especialistaSeleccionado || 
          !this.fechaSeleccionada || !this.horaSeleccionada) {
        alert('Por favor complete todos los campos');
        return;
      }
      
      // Determinar paciente con mejor logging
      let pacienteId: number;
      let pacienteNombre: string;
      
      if (this.esAdmin) {
        if (!this.pacienteSeleccionado?.id) {
          alert('Por favor seleccione un paciente');
          return;
        }
        pacienteId = this.pacienteSeleccionado.id;
        pacienteNombre = this.pacienteSeleccionado.nombreCompleto;
        console.log('Turno para paciente seleccionado por admin:', pacienteNombre, 'ID:', pacienteId);
      } else {
        if (!this.usuarioActual?.id) {
          alert('Error: Usuario no identificado');
          return;
        }
        pacienteId = this.usuarioActual.id;
        pacienteNombre = this.usuarioActual.nombreCompleto;
        console.log('Turno para usuario actual:', pacienteNombre, 'ID:', pacienteId);
      }
      
      // Convertir fecha a formato completo YYYY-MM-DD
      const [dia, mes] = this.fechaSeleccionada.split('/');
      const añoActual = new Date().getFullYear();
      const fechaCompleta = new Date(añoActual, parseInt(mes) - 1, parseInt(dia));
      const fechaStr = fechaCompleta.toISOString().split('T')[0];
      
      console.log('Fecha convertida:', fechaStr);
      
      // Verificar una vez más que el horario esté disponible
      const turnosExistentes = await this.db.obtenerTurnosExistentes(this.especialistaSeleccionado.id!, fechaStr);
      const horarioOcupado = turnosExistentes.some(t => t.hora === this.horaSeleccionada);
      
      if (horarioOcupado) {
        alert('Lo sentimos, ese horario ya fue reservado. Por favor seleccione otro.');
        await this.cargarHorariosDisponibles();
        return;
      }
      
      // Crear objeto turno
      const nuevoTurno = {
        paciente_id: pacienteId,
        especialista_id: this.especialistaSeleccionado.id!,
        especialidad: this.especialidadSeleccionada,
        fecha: fechaStr,
        hora: this.horaSeleccionada,
        estado: 'pendiente'
      };
      
      console.log('Guardando turno:', nuevoTurno);
      
      // Guardar turno usando el service
      await this.db.guardarTurno(nuevoTurno);
      
      alert(`Turno solicitado exitosamente para ${pacienteNombre}`);
      this.reiniciarFormulario();
      
    } catch (error) {
      console.error('Error al confirmar turno:', error);
      alert('Error al solicitar el turno. Intente nuevamente.');
    } finally {
      this.cargando = false;
    }
  }
  
  volver() {
  switch (this.paso) {
    case 'especialistas':
      this.paso = 'especialidades';
      this.especialidadSeleccionada = '';
      this.especialistas = [];
      break;
    case 'fechas':
      this.paso = 'especialistas';
      this.especialistaSeleccionado = null;
      this.fechasDisponibles = [];
      break;
    case 'horarios':
      this.paso = 'fechas';
      this.fechaSeleccionada = '';
      this.horariosDisponibles = [];
      break;
    case 'confirmacion':
      this.paso = 'horarios';
      this.horaSeleccionada = '';
      break;
  }
}
  
  private reiniciarFormulario() {
    this.paso = 'especialidades';
    this.especialidadSeleccionada = '';
    this.especialistaSeleccionado = null;
    this.fechaSeleccionada = '';
    this.horaSeleccionada = '';
    this.pacienteSeleccionado = null;
    this.especialistas = [];
    this.fechasDisponibles = [];
    this.horariosDisponibles = [];
  }
  
  // Métodos auxiliares para el template
  get puedeConfirmar(): boolean {
    const datosBasicos = !!(this.especialidadSeleccionada && this.especialistaSeleccionado && 
                            this.fechaSeleccionada && this.horaSeleccionada);
    
    console.log('Debug puedeConfirmar:', {
      especialidad: this.especialidadSeleccionada,
      especialista: this.especialistaSeleccionado?.nombreCompleto,
      especialistaId: this.especialistaSeleccionado?.id,
      fecha: this.fechaSeleccionada,
      hora: this.horaSeleccionada,
      esAdmin: this.esAdmin,
      pacienteSeleccionado: this.pacienteSeleccionado?.nombreCompleto,
      pacienteId: this.pacienteSeleccionado?.id,
      usuarioActual: this.usuarioActual?.nombreCompleto,
      usuarioId: this.usuarioActual?.id,
      datosBasicos
    });
    
    if (this.esAdmin) {
      return !!(datosBasicos && this.pacienteSeleccionado?.id);
    }
    
    return !!(datosBasicos && this.usuarioActual?.id);
  }
  
  get tituloSeccion(): string {
  switch (this.paso) {
    case 'especialidades':
      return 'Seleccione una Especialidad';
    case 'especialistas':
      return `Especialistas en ${this.especialidadSeleccionada}`;
    case 'fechas':
      return `Fechas disponibles - ${this.especialistaSeleccionado?.nombreCompleto}`;
    case 'horarios':
      return `Horarios disponibles - ${this.fechaSeleccionada}`;
    case 'confirmacion':
      return 'Confirmar Turno';
    default:
      return '';
  }
}

  // Método auxiliar para formatear hora a formato 12 horas (AM/PM)
  formatearHoraAmPm(hora: string): string {
    const [horas, minutos] = hora.split(':').map(Number);
    const periodo = horas >= 12 ? 'PM' : 'AM';
    const horaFormateada = horas === 0 ? 12 : horas > 12 ? horas - 12 : horas;
    return `${horaFormateada}:${minutos.toString().padStart(2, '0')} ${periodo}`;
  }

  obtenerNombrePaciente(): string {
    if (this.esAdmin) {
      return this.pacienteSeleccionado?.nombreCompleto || 'No seleccionado';
    } else {
      return this.usuarioActual?.nombreCompleto || 'No identificado';
    }
    }

  obtenerNombreEspecialista(): string {
    return this.especialistaSeleccionado?.nombreCompleto || 'No seleccionado';
    }
  
  obtenerInfoPaciente(): string {
    if (this.esAdmin) {
      if (this.pacienteSeleccionado) {
        return `${this.pacienteSeleccionado.nombreCompleto} (DNI: ${this.pacienteSeleccionado.dni})`;
      }
      return 'No seleccionado';
    } else {
      if (this.usuarioActual) {
        return `${this.usuarioActual.nombreCompleto} (DNI: ${this.usuarioActual.dni})`;
      }
      return 'No identificado';
    }
  }

  obtenerInfoEspecialista(): string {
    if (this.especialistaSeleccionado) {
      return `${this.especialistaSeleccionado.nombreCompleto} - ${this.especialidadSeleccionada}`;
    }
    return 'No seleccionado';
  }

  obtenerDebugInfo(): any {
    return {
      esAdmin: this.esAdmin,
      usuarioActual: this.usuarioActual ? {
        id: this.usuarioActual.id,
        nombre: this.usuarioActual.nombreCompleto,
        email: this.usuarioActual.email
      } : null,
      pacienteSeleccionado: this.pacienteSeleccionado ? {
        id: this.pacienteSeleccionado.id,
        nombre: this.pacienteSeleccionado.nombreCompleto,
        email: this.pacienteSeleccionado.email
      } : null,
      especialistaSeleccionado: this.especialistaSeleccionado ? {
        id: this.especialistaSeleccionado.id,
        nombre: this.especialistaSeleccionado.nombreCompleto,
        email: this.especialistaSeleccionado.email
      } : null,
      especialidad: this.especialidadSeleccionada,
      fecha: this.fechaSeleccionada,
      hora: this.horaSeleccionada,
      puedeConfirmar: this.puedeConfirmar
    };
  }
  
}