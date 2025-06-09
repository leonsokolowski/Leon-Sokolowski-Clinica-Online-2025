import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Usuario, Paciente, Especialista, Admin } from '../clases/usuario';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  sb = inject(SupabaseService);

  async obtenerUsuarioPorEmail(email: string): Promise<Usuario | null> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error al obtener usuario:', error);
      throw error;
    }

    return data as Usuario | null;
  }

  async verificarUsuarioExistente(
    email: string,
    dni: string,
    nombre: string,
    apellido: string
  ): Promise<boolean> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .select('email, dni, nombre, apellido')
      .or(
        `email.eq.${email},dni.eq.${dni},and(nombre.eq.${nombre},apellido.eq.${apellido})`
      );

    if (error) {
      console.error('Error al verificar usuario existente:', error);
      throw error;
    }

    return data && data.length > 0;
  }

  async registrarPaciente(paciente: Paciente): Promise<void> {
    // Preparar datos para insertar con los campos correctos de la BD
    const userData = {
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      edad: paciente.edad,
      dni: paciente.dni,
      email: paciente.email,
      perfil: paciente.perfil,
      obra_social: paciente.obra_social,
      imagen_perfil_1: paciente.imagen_perfil_1, // Campo separado para primera imagen
      imagen_perfil_2: paciente.imagen_perfil_2, // Campo separado para segunda imagen
      habilitado: paciente.habilitado,
    };

    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .insert(userData);

    if (error) {
      console.error('Error al registrar paciente:', error);
      throw error;
    }

    console.log('Paciente registrado exitosamente:', data);
  }

  async registrarEspecialista(especialista: Especialista): Promise<void> {
    // Preparar datos para insertar - los especialistas se registran con habilitado: false por defecto
    const userData = {
      nombre: especialista.nombre,
      apellido: especialista.apellido,
      edad: especialista.edad,
      dni: especialista.dni,
      email: especialista.email,
      perfil: especialista.perfil,
      especialidades: especialista.especialidades, // Array de especialidades
      imagen_perfil_1: especialista.imagen_perfil_1,
      habilitado: false, // Los especialistas se registran como no habilitados por defecto
    };

    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .insert(userData);

    if (error) {
      console.error('Error al registrar especialista:', error);
      throw error;
    }

    console.log(
      'Especialista registrado exitosamente (pendiente de habilitación):',
      data
    );
  }

  async registrarAdmin(admin: Admin): Promise<void> {
    // Preparar datos para insertar con los campos correctos de la BD
    const userData = {
      nombre: admin.nombre,
      apellido: admin.apellido,
      edad: admin.edad,
      dni: admin.dni,
      email: admin.email,
      perfil: admin.perfil, // 'admin'
      imagen_perfil_1: admin.imagen_perfil_1,
      habilitado: admin.habilitado, // true por defecto para admins
    };

    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .insert(userData);

    if (error) {
      console.error('Error al registrar admin:', error);
      throw error;
    }

    console.log('Administrador registrado exitosamente:', data);
  }

  // Subir imagen al storage de Supabase
  async subirImagen(file: File, path: string): Promise<string> {
    const { data, error } = await this.sb.supabase.storage
      .from('imagenes-perfil')
      .upload(path, file);

    if (error) {
      console.error('Error al subir imagen:', error);
      throw error;
    }

    // Obtener URL pública de la imagen
    const { data: publicURL } = this.sb.supabase.storage
      .from('imagenes-perfil')
      .getPublicUrl(path);

    return publicURL.publicUrl;
  }

  // Eliminar imagen del storage
  async eliminarImagen(path: string): Promise<void> {
    const { error } = await this.sb.supabase.storage
      .from('imagenes-perfil')
      .remove([path]);

    if (error) {
      console.error('Error al eliminar imagen:', error);
      throw error;
    }
  }

  async habilitarEspecialista(email: string): Promise<void> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .update({ habilitado: true })
      .eq('email', email)
      .eq('perfil', 'especialista');

    if (error) {
      console.error('Error al habilitar especialista:', error);
      throw error;
    }

    console.log('Especialista habilitado exitosamente:', data);
  }

  async deshabilitarEspecialista(email: string): Promise<void> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .update({ habilitado: false })
      .eq('email', email)
      .eq('perfil', 'especialista');

    if (error) {
      console.error('Error al deshabilitar especialista:', error);
      throw error;
    }

    console.log('Especialista deshabilitado exitosamente:', data);
  }

  async eliminarUsuario(email: string): Promise<void> {
    try {
      console.log('Iniciando eliminación del usuario:', email);

      // 1. Obtener datos del usuario antes de eliminarlo
      const usuario = await this.obtenerUsuarioPorEmail(email);
      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      // 2. Eliminar imágenes del storage
      await this.eliminarImagenesUsuario(usuario);

      // 3. Eliminar horarios si es especialista
      if (usuario.perfil === 'especialista' && usuario.id) {
        await this.eliminarHorariosEspecialista(usuario.id);
      }

      // 4. Eliminar de la tabla usuarios
      const { error: dbError } = await this.sb.supabase
        .from('usuarios')
        .delete()
        .eq('email', email);

      if (dbError) {
        console.error('Error al eliminar usuario de la BD:', dbError);
        throw dbError;
      }

      console.log('Usuario eliminado completamente (BD + Storage)');
    } catch (error) {
      console.error('Error en eliminación del usuario:', error);
      throw error;
    }
  }

  private async eliminarImagenesUsuario(usuario: Usuario): Promise<void> {
    try {
      const imagenesAEliminar: string[] = [];

      // Extraer paths de las imágenes
      if (usuario.imagen_perfil_1) {
        const path1 = this.extraerPathDeUrl(usuario.imagen_perfil_1);
        if (path1) imagenesAEliminar.push(path1);
      }

      // Solo pacientes tienen imagen_perfil_2
      if (usuario.perfil === 'paciente') {
        const paciente = usuario as Paciente;
        if (paciente.imagen_perfil_2) {
          const path2 = this.extraerPathDeUrl(paciente.imagen_perfil_2);
          if (path2) imagenesAEliminar.push(path2);
        }
      }

      // Eliminar imágenes del storage
      if (imagenesAEliminar.length > 0) {
        const { error } = await this.sb.supabase.storage
          .from('imagenes-perfil')
          .remove(imagenesAEliminar);

        if (error) {
          console.error('Error al eliminar imágenes del storage:', error);
          // No lanzar error para no interrumpir la eliminación completa
        } else {
          console.log('Imágenes eliminadas del storage:', imagenesAEliminar);
        }
      }
    } catch (error) {
      console.error('Error al procesar eliminación de imágenes:', error);
      // No lanzar error para no interrumpir la eliminación completa
    }
  }

  private extraerPathDeUrl(url: string): string | null {
    try {
      // Formato típico: https://proyecto.supabase.co/storage/v1/object/public/imagenes-perfil/path/to/image.jpg
      const regex = /\/storage\/v1\/object\/public\/imagenes-perfil\/(.+)$/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error al extraer path de URL:', error);
      return null;
    }
  }

  async obtenerUsuariosPorPerfil(perfil: string): Promise<Usuario[]> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .select('*')
      .eq('perfil', perfil);

    if (error) {
      console.error(`Error al obtener usuarios con perfil ${perfil}:`, error);
      throw error;
    }

    return data as Usuario[];
  }

  async obtenerPacientes(): Promise<Paciente[]> {
    return (await this.obtenerUsuariosPorPerfil('paciente')) as Paciente[];
  }

  async obtenerEspecialistas(): Promise<Especialista[]> {
    return (await this.obtenerUsuariosPorPerfil(
      'especialista'
    )) as Especialista[];
  }

  async cargarHorariosEspecialista(usuario_id: number): Promise<any[]> {
    const { data, error } = await this.sb.supabase
      .from('horarios_especialistas')
      .select('*')
      .eq('usuario_id', usuario_id)
      .order('especialidad', { ascending: true })
      .order('dia', { ascending: true });

    if (error) {
      console.error('Error al cargar horarios:', error);
      return [];
    }

    return data || [];
  }

  async guardarHorariosEspecialista(horarios: any[]): Promise<void> {
    const { data, error } = await this.sb.supabase
      .from('horarios_especialistas')
      .insert(horarios);

    if (error) {
      console.error('Error al guardar horarios:', error);
      throw error;
    }

    console.log('Horarios guardados exitosamente:', data);
  }

  async eliminarHorariosEspecialista(usuarioId: number): Promise<void> {
    const { error } = await this.sb.supabase
      .from('horarios_especialistas')
      .delete()
      .eq('usuario_id', usuarioId);

    if (error) {
      console.error('Error al eliminar horarios:', error);
      throw error;
    }

    console.log('Horarios eliminados exitosamente');
  }

  // Métodos completos para agregar al final de la clase DatabaseService

  // Obtener todas las especialidades disponibles
  async obtenerEspecialidades(): Promise<string[]> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .select('especialidades')
      .eq('perfil', 'especialista')
      .eq('habilitado', true);

    if (error) {
      console.error('Error al obtener especialidades:', error);
      throw error;
    }

    // Extraer todas las especialidades únicas
    const especialidadesSet = new Set<string>();
    data?.forEach((especialista: any) => {
      if (
        especialista.especialidades &&
        Array.isArray(especialista.especialidades)
      ) {
        especialista.especialidades.forEach((esp: string) => {
          especialidadesSet.add(esp);
        });
      }
    });

    return Array.from(especialidadesSet).sort();
  }

  // Obtener especialistas por especialidad
  async obtenerEspecialistasPorEspecialidad(
    especialidad: string
  ): Promise<Especialista[]> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .select('*')
      .eq('perfil', 'especialista')
      .eq('habilitado', true)
      .contains('especialidades', [especialidad]);

    if (error) {
      console.error('Error al obtener especialistas:', error);
      throw error;
    }

    return data as Especialista[];
  }

  // Obtener días disponibles para un especialista en una especialidad específica
  async obtenerDiasDisponibles(
    especialistaId: number,
    especialidad: string
  ): Promise<string[]> {
    console.log('Buscando días disponibles para:', {
      especialistaId,
      especialidad,
    });

    // Obtener horarios del especialista para esa especialidad
    const { data: horarios, error } = await this.sb.supabase
      .from('horarios_especialistas')
      .select('dia')
      .eq('usuario_id', especialistaId)
      .eq('especialidad', especialidad);

    console.log('Horarios obtenidos:', horarios);

    if (error) {
      console.error('Error al obtener días disponibles:', error);
      throw error;
    }

    if (!horarios || horarios.length === 0) {
      console.log('No se encontraron horarios para el especialista');
      return [];
    }

    // Obtener días únicos y filtrarlos para solo incluir días laborables
    const diasSet = new Set(horarios.map((h) => h.dia));
    const diasDisponibles = Array.from(diasSet).filter((dia) =>
      ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].includes(dia)
    );

    // Generar fechas para los próximos 15 días que coincidan con los días disponibles
    const fechasDisponibles: string[] = [];
    const hoy = new Date();

    for (let i = 1; i <= 15; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);

      const diaSemana = this.obtenerNombreDia(fecha.getDay());

      // Solo procesar días laborables
      if (diasDisponibles.includes(diaSemana)) {
        const fechaFormatoCompleto = this.formatearFechaCompleta(fecha); // YYYY-MM-DD para BD
        const fechaFormatoDisplay = this.formatearFechaDisplay(fecha); // DD/MM para mostrar

        // Verificar disponibilidad usando formato completo
        const tieneEspacio = await this.verificarDisponibilidadFecha(
          especialistaId,
          fechaFormatoCompleto,
          especialidad
        );

        if (tieneEspacio) {
          fechasDisponibles.push(fechaFormatoDisplay); // Devolvemos formato display
        }
      }
    }

    return fechasDisponibles;
  }

  // Obtener horarios disponibles para un día específico
  async obtenerHorariosDisponibles(
    especialistaId: number,
    especialidad: string,
    fechaDisplay: string // Recibe formato DD/MM
  ): Promise<string[]> {
    console.log('Buscando horarios para:', {
      especialistaId,
      especialidad,
      fechaDisplay,
    });

    // Convertir fecha display a formato completo para consultas BD
    const fechaCompleta = this.convertirFechaDisplayACompleta(fechaDisplay);
    const fechaObj = new Date(fechaCompleta);
    const diaSemana = this.obtenerNombreDia(fechaObj.getDay());

    // Verificar que sea día laborable
    if (
      !['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].includes(diaSemana)
    ) {
      return [];
    }

    // Obtener horarios del especialista para ese día y especialidad
    const { data: horarios, error } = await this.sb.supabase
      .from('horarios_especialistas')
      .select('hora_inicio, hora_final')
      .eq('usuario_id', especialistaId)
      .eq('especialidad', especialidad)
      .eq('dia', diaSemana);

    if (error || !horarios || horarios.length === 0) {
      return [];
    }

    // Obtener turnos ya ocupados para esa fecha (usar formato completo)
    const { data: turnosOcupados } = await this.sb.supabase
      .from('turnos')
      .select('hora')
      .eq('especialista_id', especialistaId)
      .eq('fecha', fechaCompleta) // Usar formato completo para consulta
      .eq('especialidad', especialidad)
      .neq('estado', 'cancelado');

    const horasOcupadas = new Set(turnosOcupados?.map((t) => t.hora) || []);

    // Generar slots de tiempo disponibles
    const horariosDisponibles: string[] = [];

    horarios.forEach((horario) => {
      const slots = this.generarSlotsHorarios(
        horario.hora_inicio,
        horario.hora_final
      );

      slots.forEach((slot) => {
        if (!horasOcupadas.has(slot)) {
          horariosDisponibles.push(slot);
        }
      });
    });

    return horariosDisponibles.sort();
  }

  // Crear un nuevo turno
  async crearTurno(turno: {
    paciente_id: number;
    especialista_id: number;
    especialidad: string;
    fecha: string; // Recibe formato DD/MM
    hora: string;
    estado: string;
  }): Promise<void> {
    // Convertir fecha display a formato completo para BD
    const fechaCompleta = this.convertirFechaDisplayACompleta(turno.fecha);

    const { data, error } = await this.sb.supabase.from('turnos').insert({
      paciente_id: turno.paciente_id,
      especialista_id: turno.especialista_id,
      especialidad: turno.especialidad,
      fecha: fechaCompleta, // Usar formato completo
      hora: turno.hora,
      estado: turno.estado || 'solicitado',
    });

    if (error) {
      console.error('Error al crear turno:', error);
      throw error;
    }

    console.log('Turno creado exitosamente:', data);
  }

  // Obtener todos los horarios de un especialista (para debug)
  async obtenerTodosLosHorarios(especialistaId: number): Promise<any[]> {
    const { data, error } = await this.sb.supabase
      .from('horarios_especialistas')
      .select('*')
      .eq('usuario_id', especialistaId);

    if (error) {
      console.error('Error obteniendo todos los horarios:', error);
      return [];
    }

    return data || [];
  }

  // Métodos auxiliares privados

  // Obtener nombre del día - SOLO DÍAS LABORABLES
  private obtenerNombreDia(numeroDia: number): string {
    const dias = [
      'Domingo', // 0 - No laborable
      'Lunes', // 1 - Laborable
      'Martes', // 2 - Laborable
      'Miércoles', // 3 - Laborable
      'Jueves', // 4 - Laborable
      'Viernes', // 5 - Laborable
      'Sábado', // 6 - No laborable
    ];
    return dias[numeroDia];
  }

  // Formatear fecha DD/MM
  private formatearFechaDisplay(fecha: Date): string {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    return `${dia}/${mes}`;
  }

  private formatearFechaCompleta(fecha: Date): string {
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }

  private convertirFechaDisplayACompleta(fechaDisplay: string): string {
    const [dia, mes] = fechaDisplay.split('/').map(Number);
    const año = new Date().getFullYear();

    // Si el mes es menor al actual, asumir que es del próximo año
    const mesActual = new Date().getMonth() + 1;
    const añoFinal = mes < mesActual ? año + 1 : año;

    return `${añoFinal}-${mes.toString().padStart(2, '0')}-${dia
      .toString()
      .padStart(2, '0')}`;
  }

  private parsearFechaDisplay(fechaDisplay: string): Date {
    const [dia, mes] = fechaDisplay.split('/').map(Number);
    const año = new Date().getFullYear();

    // Si el mes es menor al actual, asumir que es del próximo año
    const mesActual = new Date().getMonth() + 1;
    const añoFinal = mes < mesActual ? año + 1 : año;

    return new Date(añoFinal, mes - 1, dia);
  }

  // Parsear fecha string a Date
  private parsearFecha(fechaStr: string): Date {
    const [dia, mes] = fechaStr.split('/').map(Number);
    const año = new Date().getFullYear();

    // Crear fecha correctamente
    const fecha = new Date(año, mes - 1, dia);
    console.log(`Parseando fecha: ${fechaStr} -> ${fecha.toDateString()}`);

    return fecha;
  }

  // Verificar disponibilidad de una fecha específica
  private async verificarDisponibilidadFecha(
    especialistaId: number,
    fechaCompleta: string, // Recibe formato YYYY-MM-DD
    especialidad: string
  ): Promise<boolean> {
    try {
      const fechaObj = new Date(fechaCompleta);
      const diaSemana = this.obtenerNombreDia(fechaObj.getDay());

      // Verificar que sea día laborable
      if (
        !['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].includes(
          diaSemana
        )
      ) {
        return false;
      }

      // Verificar si el especialista trabaja ese día en esa especialidad
      const { data: horarios, error } = await this.sb.supabase
        .from('horarios_especialistas')
        .select('hora_inicio, hora_final')
        .eq('usuario_id', especialistaId)
        .eq('especialidad', especialidad)
        .eq('dia', diaSemana);

      if (error || !horarios || horarios.length === 0) {
        return false;
      }

      // Obtener turnos ocupados para esa fecha
      const { data: turnosOcupados } = await this.sb.supabase
        .from('turnos')
        .select('hora')
        .eq('especialista_id', especialistaId)
        .eq('fecha', fechaCompleta) // Usar formato completo
        .eq('especialidad', especialidad)
        .neq('estado', 'cancelado');

      const horasOcupadas = new Set(turnosOcupados?.map((t) => t.hora) || []);

      // Generar todos los slots posibles y verificar si hay alguno disponible
      let hayEspacioDisponible = false;

      horarios.forEach((horario) => {
        const slots = this.generarSlotsHorarios(
          horario.hora_inicio,
          horario.hora_final
        );

        const slotsDisponibles = slots.filter(
          (slot) => !horasOcupadas.has(slot)
        );
        if (slotsDisponibles.length > 0) {
          hayEspacioDisponible = true;
        }
      });

      return hayEspacioDisponible;
    } catch (error) {
      console.error('Error verificando disponibilidad:', error);
      return false;
    }
  }

  // Generar slots de horarios cada 30 minutos
  private generarSlotsHorarios(
    horaInicio: string,
    horaFinal: string
  ): string[] {
    const slots: string[] = [];

    console.log('Generando slots entre:', horaInicio, 'y', horaFinal);

    try {
      // Limpiar formato de tiempo si viene con milisegundos
      const inicioLimpio = horaInicio.split('.')[0]; // Elimina milisegundos si existen
      const finalLimpio = horaFinal.split('.')[0];

      // Convertir horas a minutos para facilitar el cálculo
      const [inicioHora, inicioMin] = inicioLimpio.split(':').map(Number);
      const [finalHora, finalMin] = finalLimpio.split(':').map(Number);

      const inicioMinutos = inicioHora * 60 + inicioMin;
      const finalMinutos = finalHora * 60 + finalMin;

      console.log(
        'Minutos inicio:',
        inicioMinutos,
        'Minutos final:',
        finalMinutos
      );

      // Generar slots cada 30 minutos
      for (let minutos = inicioMinutos; minutos < finalMinutos; minutos += 30) {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;

        const horaFormateada = `${horas.toString().padStart(2, '0')}:${mins
          .toString()
          .padStart(2, '0')}`;
        slots.push(horaFormateada);
      }
    } catch (error) {
      console.error('Error generando slots:', error);
    }

    console.log('Slots generados:', slots);
    return slots;
  }
}
