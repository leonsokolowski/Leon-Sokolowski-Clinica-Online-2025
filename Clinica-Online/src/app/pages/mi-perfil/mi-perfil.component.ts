import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Usuario, Especialista, Paciente } from '../../clases/usuario';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DatabaseService } from '../../services/database.service';

interface HorarioEspecialista {
  id?: number;
  usuario_id?: number;
  especialidad: string;
  dia: string;
  hora_inicio: string;
  hora_final: string;
}

interface NuevoHorario {
  especialidad: string;
  dia: string;
  hora_inicio: string;
  hora_final: string;
}

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.css']
})
export class MiPerfilComponent implements OnInit {
  
  authService = inject(AuthService);
  databaseService = inject(DatabaseService);
  
  usuario: Usuario | null = null;
  esEspecialista: boolean = false;
  especialidades: string[] = [];
  horariosExistentes: HorarioEspecialista[] = [];
  nuevosHorarios: NuevoHorario[] = [];
  modoEdicion: boolean = false;
  
  diasDisponibles = [
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Todos los días'
  ];
  
  horasDisponibles: string[] = [];
  
  mensajeError: string = '';
  mensajeExito: string = '';
  cargando: boolean = false;

  // Getters para manejo de tipos
  get esPaciente(): boolean {
    return this.usuario?.perfil === 'paciente';
  }

  get usuarioPaciente(): Paciente | null {
    return this.esPaciente ? this.usuario as Paciente : null;
  }

  get usuarioEspecialista(): Especialista | null {
    return this.esEspecialista ? this.usuario as Especialista : null;
  }

  // Método helper para obtener la segunda imagen
  obtenerSegundaImagen(): string | undefined {
    if (this.esPaciente && this.usuario) {
      return (this.usuario as Paciente).imagen_perfil_2;
    }
    return undefined;
  }

  ngOnInit() {
    this.generarHorasDisponibles();
    this.cargarDatosUsuario();
  }

  private generarHorasDisponibles() {
    for (let i = 6; i <= 22; i++) {
      this.horasDisponibles.push(i.toString().padStart(2, '0'));
    }
  }

  async cargarDatosUsuario() {
    try {
      this.cargando = true;
      const email = this.authService.usuarioActual?.email;
      
      if (!email) {
        this.mensajeError = 'No se pudo obtener el email del usuario';
        return;
      }

      this.usuario = await this.databaseService.obtenerUsuarioPorEmail(email);
      
      if (!this.usuario) {
        this.mensajeError = 'Usuario no encontrado';
        return;
      }

      this.esEspecialista = this.usuario.perfil === 'especialista';
      
      if (this.esEspecialista) {
        const especialista = this.usuario as Especialista;
        this.especialidades = Array.isArray(especialista.especialidades) 
          ? especialista.especialidades 
          : [];
        
        await this.cargarHorariosExistentes();
      }

    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
      this.mensajeError = 'Error al cargar los datos del usuario';
    } finally {
      this.cargando = false;
    }
  }

  async cargarHorariosExistentes() {
    try {
      if (!this.usuario?.id) {
        console.error('No hay usuario ID disponible');
        return;
      }

      // Consultar horarios existentes desde la base de datos
      const { data, error } = await this.databaseService.sb.supabase
        .from('horarios_especialistas')
        .select('*')
        .eq('usuario_id', this.usuario.id)
        .order('especialidad', { ascending: true })
        .order('dia', { ascending: true });

      if (error) {
        console.error('Error al cargar horarios:', error);
        return;
      }

      console.log('Horarios cargados desde BD:', data);
      this.horariosExistentes = data || [];
      this.modoEdicion = true; // Siempre empezar en modo edición
      
      // Limpiar el array de nuevos horarios
      this.nuevosHorarios = [];

    } catch (error) {
      console.error('Error al cargar horarios existentes:', error);
    }
  }

  inicializarNuevosHorarios() {
    this.nuevosHorarios = [];
    // Solo inicializar si NO hay horarios existentes
    if (this.horariosExistentes.length === 0) {
      this.especialidades.forEach(especialidad => {
        this.nuevosHorarios.push({
          especialidad: especialidad,
          dia: '',
          hora_inicio: '',
          hora_final: ''
        });
      });
    }
  }

  agregarNuevoHorario(especialidad: string) {
    this.nuevosHorarios.push({
      especialidad: especialidad,
      dia: '',
      hora_inicio: '',
      hora_final: ''
    });
  }

  eliminarHorario(index: number) {
    this.nuevosHorarios.splice(index, 1);
  }

  validarHorarios(): boolean {
    this.mensajeError = '';
    
    // Validar que todos los campos estén completos
    for (const horario of this.nuevosHorarios) {
      if (!horario.especialidad || !horario.dia || !horario.hora_inicio || !horario.hora_final) {
        this.mensajeError = 'Todos los campos son obligatorios';
        return false;
      }

      const horaInicio = parseInt(horario.hora_inicio);
      const horaFinal = parseInt(horario.hora_final);

      if (horaInicio >= horaFinal) {
        this.mensajeError = 'La hora de inicio debe ser menor que la hora final';
        return false;
      }
    }

    // Validar superposiciones
    if (!this.validarSuperposiciones()) {
      return false;
    }

    return true;
  }

  validarSuperposiciones(): boolean {
    const horariosExpandidos: any[] = [];
    
    // Expandir horarios "Todos los días" a días individuales
    this.nuevosHorarios.forEach(horario => {
      if (horario.dia === 'Todos los días') {
        ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].forEach(dia => {
          horariosExpandidos.push({
            ...horario,
            dia: dia
          });
        });
      } else {
        horariosExpandidos.push(horario);
      }
    });

    // Agrupar por día y verificar superposiciones
    const horariosPorDia: { [key: string]: any[] } = {};
    
    horariosExpandidos.forEach(horario => {
      if (!horariosPorDia[horario.dia]) {
        horariosPorDia[horario.dia] = [];
      }
      horariosPorDia[horario.dia].push(horario);
    });

    // Verificar superposiciones en cada día
    for (const dia in horariosPorDia) {
      const horariosDelDia = horariosPorDia[dia];
      
      for (let i = 0; i < horariosDelDia.length; i++) {
        for (let j = i + 1; j < horariosDelDia.length; j++) {
          const horario1 = horariosDelDia[i];
          const horario2 = horariosDelDia[j];
          
          const inicio1 = parseInt(horario1.hora_inicio);
          const final1 = parseInt(horario1.hora_final);
          const inicio2 = parseInt(horario2.hora_inicio);
          const final2 = parseInt(horario2.hora_final);

          // Verificar superposición
          if ((inicio1 < final2 && final1 > inicio2)) {
            this.mensajeError = `Superposición detectada el ${dia} entre ${horario1.especialidad} y ${horario2.especialidad}`;
            return false;
          }
        }
      }
    }

    return true;
  }

  async guardarHorarios() {
    if (!this.validarHorarios()) {
      return;
    }

    try {
      this.cargando = true;
      this.mensajeError = '';
      
      // Expandir horarios "Todos los días"
      const horariosParaGuardar: any[] = [];
      
      this.nuevosHorarios.forEach(horario => {
        if (horario.dia === 'Todos los días') {
          ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].forEach(dia => {
            horariosParaGuardar.push({
              usuario_id: this.usuario?.id,
              especialidad: horario.especialidad,
              dia: dia,
              hora_inicio: horario.hora_inicio + ':00',
              hora_final: horario.hora_final + ':00'
            });
          });
        } else {
          horariosParaGuardar.push({
            usuario_id: this.usuario?.id,
            especialidad: horario.especialidad,
            dia: horario.dia,
            hora_inicio: horario.hora_inicio + ':00',
            hora_final: horario.hora_final + ':00'
          });
        }
      });

      console.log('Horarios para guardar:', horariosParaGuardar);
      console.log('Horarios existentes antes de eliminar:', this.horariosExistentes);

      // SIEMPRE eliminar horarios existentes antes de insertar nuevos
      if (this.usuario?.id) {
        const { error: deleteError } = await this.databaseService.sb.supabase
          .from('horarios_especialistas')
          .delete()
          .eq('usuario_id', this.usuario.id);
        
        if (deleteError) {
          console.error('Error al eliminar horarios existentes:', deleteError);
          throw deleteError;
        }
        
        console.log('Horarios existentes eliminados exitosamente');
      }

      // Insertar nuevos horarios
      if (horariosParaGuardar.length > 0) {
        const { error: insertError } = await this.databaseService.sb.supabase
          .from('horarios_especialistas')
          .insert(horariosParaGuardar);

        if (insertError) {
          console.error('Error al insertar nuevos horarios:', insertError);
          throw insertError;
        }
        
        console.log('Nuevos horarios insertados exitosamente');
      }

      this.mensajeExito = 'Horarios guardados exitosamente';
      setTimeout(() => {
        this.mensajeExito = '';
      }, 3000);
      
      await this.cargarHorariosExistentes();
      
    } catch (error) {
      console.error('Error al guardar horarios:', error);
      this.mensajeError = 'Error al guardar los horarios';
    } finally {
      this.cargando = false;
    }
  }

  editarHorarios() {
    this.modoEdicion = false;
    this.nuevosHorarios = []; // Limpiar array antes de cargar
    
    // Cargar horarios existentes en el formulario
    this.horariosExistentes.forEach(horario => {
      this.nuevosHorarios.push({
        especialidad: horario.especialidad,
        dia: horario.dia,
        hora_inicio: horario.hora_inicio.split(':')[0],
        hora_final: horario.hora_final.split(':')[0]
      });
    });
    
    // Limpiar mensajes
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  cancelarEdicion() {
    this.cargarHorariosExistentes();
    this.mensajeError = '';
    this.mensajeExito = '';
  }

  obtenerHorariosPorEspecialidad(especialidad: string): NuevoHorario[] {
    return this.nuevosHorarios.filter(h => h.especialidad === especialidad);
  }

  puedeAgregarHorario(especialidad: string): boolean {
    const horariosEsp = this.obtenerHorariosPorEspecialidad(especialidad);
    return horariosEsp.length === 0 || horariosEsp.some(h => h.dia !== 'Todos los días');
  }
}