import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Usuario, Paciente, Especialista, Admin } from '../clases/usuario';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  sb = inject(SupabaseService);

  //Se usa en la mayoría de componentes
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

  async obtenerNombreCompletoUsuarioPorId(id: number): Promise<string | null> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .select('nombre, apellido')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error al obtener usuario:', error);
      throw error;
    }

    if (!data) return null;

    return `${data.nombre} ${data.apellido}`;
  }
  
  //Se usa en los registros
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
  //Se usa en registroUsuarios
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
  //Se usa en registroEspecialista
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
  //Se usa en registroAdmin
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

  //Subir imagen al storage de Supabase
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

  //Eliminar imagen del storage
  async eliminarImagen(path: string): Promise<void> {
    const { error } = await this.sb.supabase.storage
      .from('imagenes-perfil')
      .remove([path]);

    if (error) {
      console.error('Error al eliminar imagen:', error);
      throw error;
    }
  }

  //Se usa en administración especialistas
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

  //Se usa en administración especialistas
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

  //Se usa en administración especialistas
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

  //Se usa en eliminarUsuario
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

  //Se usa en eliminarImagenesUsuario
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

 async obtenerDiasDisponibles(
  especialistaId: number,
  especialidad: string
): Promise<string[]> {
  console.log('Buscando días disponibles para:', {
    especialistaId,
    especialidad,
  });

  // Función auxiliar interna: Obtener nombre del día
  const obtenerNombreDia = (numeroDia: number): string => {
    const dias = [
      'Domingo', // 0
      'Lunes', // 1
      'Martes', // 2
      'Miércoles', // 3
      'Jueves', // 4
      'Viernes', // 5
      'Sábado', // 6
    ];
    return dias[numeroDia];
  };

  // Función auxiliar interna: Formatear fecha DD/MM
  const formatearFechaDisplay = (fecha: Date): string => {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    return `${dia}/${mes}`;
  };

  // Función auxiliar interna: Formatear fecha completa YYYY-MM-DD
  const formatearFechaCompleta = (fecha: Date): string => {
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };

  // CORRECCIÓN CRÍTICA: Función para crear fecha local sin problemas de zona horaria
  const crearFechaLocal = (fechaCompleta: string): Date => {
    const [año, mes, dia] = fechaCompleta.split('-').map(Number);
    // Crear fecha a mediodía para evitar problemas de zona horaria
    return new Date(año, mes - 1, dia, 12, 0, 0);
  };

  // Función auxiliar interna: Verificar disponibilidad de una fecha específica
  const verificarDisponibilidadFecha = async (
    especialistaId: number,
    fechaCompleta: string,
    especialidad: string
  ): Promise<boolean> => {
    try {
      const fechaObj = crearFechaLocal(fechaCompleta);
      const diaSemana = obtenerNombreDia(fechaObj.getDay());

      console.log(`Verificando fecha ${fechaCompleta} (${diaSemana}) para especialidad ${especialidad}`);

      // Verificar si el especialista trabaja ese día en esa especialidad
      const { data: horarios, error } = await this.sb.supabase
        .from('horarios_especialistas')
        .select('hora_inicio, hora_final')
        .eq('usuario_id', especialistaId)
        .eq('especialidad', especialidad)
        .eq('dia', diaSemana);

      console.log(`Horarios encontrados para ${diaSemana}:`, horarios);

      if (error) {
        console.error('Error consultando horarios:', error);
        return false;
      }

      if (!horarios || horarios.length === 0) {
        console.log(`No hay horarios para ${diaSemana} en ${especialidad}`);
        return false;
      }

      // Obtener turnos ocupados para esa fecha
      const { data: turnosOcupados, error: errorTurnos } = await this.sb.supabase
        .from('turnos')
        .select('hora')
        .eq('especialista_id', especialistaId)
        .eq('fecha', fechaCompleta)
        .eq('especialidad', especialidad)
        .neq('estado', 'cancelado');

      if (errorTurnos) {
        console.error('Error consultando turnos ocupados:', errorTurnos);
        return false;
      }

      const horasOcupadas = new Set(turnosOcupados?.map((t) => t.hora) || []);
      console.log('Horas ocupadas:', Array.from(horasOcupadas));

      // Función auxiliar interna: Generar slots de horarios cada 30 minutos
      const generarSlotsHorarios = (
        horaInicio: string,
        horaFinal: string
      ): string[] => {
        const slots: string[] = [];

        try {
          // Limpiar formato de tiempo si viene con milisegundos o microsegundos
          const inicioLimpio = horaInicio.includes('.') ? horaInicio.split('.')[0] : horaInicio;
          const finalLimpio = horaFinal.includes('.') ? horaFinal.split('.')[0] : horaFinal;

          // Asegurarse de que el formato sea HH:MM:SS
          const formatearHora = (hora: string): string => {
            const partes = hora.split(':');
            if (partes.length === 2) {
              return `${partes[0]}:${partes[1]}:00`;
            }
            return hora;
          };

          const inicioFormateado = formatearHora(inicioLimpio);
          const finalFormateado = formatearHora(finalLimpio);

          // Convertir horas a minutos para facilitar el cálculo
          const [inicioHora, inicioMin] = inicioFormateado.split(':').map(Number);
          const [finalHora, finalMin] = finalFormateado.split(':').map(Number);

          const inicioMinutos = inicioHora * 60 + inicioMin;
          const finalMinutos = finalHora * 60 + finalMin;

          // Generar slots cada 30 minutos
          for (let minutos = inicioMinutos; minutos < finalMinutos; minutos += 30) {
            const horas = Math.floor(minutos / 60);
            const mins = minutos % 60;

            const horaFormateada = `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
            slots.push(horaFormateada);
          }
        } catch (error) {
          console.error('Error generando slots:', error);
        }

        return slots;
      };

      // Generar todos los slots posibles y verificar si hay alguno disponible
      let hayEspacioDisponible = false;

      horarios.forEach((horario) => {
        const slots = generarSlotsHorarios(
          horario.hora_inicio,
          horario.hora_final
        );

        const slotsDisponibles = slots.filter(
          (slot) => !horasOcupadas.has(slot)
        );
        
        console.log(`Slots para ${horario.hora_inicio}-${horario.hora_final}:`, slots.length);
        console.log(`Slots disponibles:`, slotsDisponibles.length);
        
        if (slotsDisponibles.length > 0) {
          hayEspacioDisponible = true;
        }
      });

      console.log(`Fecha ${fechaCompleta} tiene espacio disponible:`, hayEspacioDisponible);
      return hayEspacioDisponible;
    } catch (error) {
      console.error('Error verificando disponibilidad:', error);
      return false;
    }
  };

  try {
    // Obtener los horarios del especialista para la especialidad específica
    const { data: horarios, error } = await this.sb.supabase
      .from('horarios_especialistas')
      .select('dia, hora_inicio, hora_final')
      .eq('usuario_id', especialistaId)
      .eq('especialidad', especialidad);

    console.log('Horarios obtenidos de la BD:', horarios);

    if (error) {
      console.error('Error obteniendo horarios:', error);
      return [];
    }

    if (!horarios || horarios.length === 0) {
      console.log('No se encontraron horarios para este especialista y especialidad');
      return [];
    }

    // Obtener días únicos en los que trabaja
    const diasDisponibles = [...new Set(horarios.map(h => h.dia))];
    console.log('Días únicos encontrados:', diasDisponibles);

    const fechasDisponibles: string[] = [];
    const hoy = new Date();
    
    console.log('Generando fechas para los próximos 15 días...');
    console.log('Fecha actual:', formatearFechaCompleta(hoy));

    // Generar fechas para los próximos 15 días
    for (let i = 1; i <= 15; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i, 12, 0, 0);
      
      const fechaDisplay = formatearFechaDisplay(fecha);
      const fechaCompleta = formatearFechaCompleta(fecha);
      const diaSemana = obtenerNombreDia(fecha.getDay());
      
      console.log(`Día ${i}: ${fechaDisplay} (${fechaCompleta}) es ${diaSemana}`);
      
      // Verificar si el especialista trabaja ese día
      if (diasDisponibles.includes(diaSemana)) {
        console.log(`${diaSemana} está en los días disponibles, verificando disponibilidad...`);
        
        const tieneEspacio = await verificarDisponibilidadFecha(
          especialistaId,
          fechaCompleta,
          especialidad
        );
        
        if (tieneEspacio) {
          fechasDisponibles.push(fechaDisplay);
          console.log(`✅ Fecha con espacio: ${fechaDisplay}`);
        } else {
          console.log(`❌ Fecha sin espacio: ${fechaDisplay}`);
        }
      } else {
        console.log(`${diaSemana} NO está en los días disponibles`);
      }
    }

    console.log('Fechas finales disponibles:', fechasDisponibles);
    return fechasDisponibles;

  } catch (error) {
    console.error('Error obteniendo días disponibles:', error);
    return [];
  }
}

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

  // Función auxiliar interna: Obtener nombre del día
  const obtenerNombreDia = (numeroDia: number): string => {
    const dias = [
      'Domingo', // 0
      'Lunes', // 1
      'Martes', // 2
      'Miércoles', // 3
      'Jueves', // 4
      'Viernes', // 5
      'Sábado', // 6
    ];
    return dias[numeroDia];
  };

  // Función auxiliar interna: Convertir fecha display a completa
  const convertirFechaDisplayACompleta = (fechaDisplay: string): string => {
    const [dia, mes] = fechaDisplay.split('/').map(Number);
    const año = new Date().getFullYear();

    // Si el mes es menor al actual, asumir que es del próximo año
    const mesActual = new Date().getMonth() + 1;
    const añoFinal = mes < mesActual ? año + 1 : año;

    return `${añoFinal}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
  };

  // Función auxiliar interna: Generar slots de horarios cada 30 minutos
  const generarSlotsHorarios = (
    horaInicio: string,
    horaFinal: string
  ): string[] => {
    const slots: string[] = [];

    console.log('Generando slots entre:', horaInicio, 'y', horaFinal);

    try {
      // Limpiar formato de tiempo si viene con milisegundos o microsegundos
      const inicioLimpio = horaInicio.includes('.') ? horaInicio.split('.')[0] : horaInicio;
      const finalLimpio = horaFinal.includes('.') ? horaFinal.split('.')[0] : horaFinal;

      // Asegurarse de que el formato sea HH:MM:SS
      const formatearHora = (hora: string): string => {
        const partes = hora.split(':');
        if (partes.length === 2) {
          return `${partes[0]}:${partes[1]}:00`;
        }
        return hora;
      };

      const inicioFormateado = formatearHora(inicioLimpio);
      const finalFormateado = formatearHora(finalLimpio);

      // Convertir horas a minutos para facilitar el cálculo
      const [inicioHora, inicioMin] = inicioFormateado.split(':').map(Number);
      const [finalHora, finalMin] = finalFormateado.split(':').map(Number);

      const inicioMinutos = inicioHora * 60 + inicioMin;
      const finalMinutos = finalHora * 60 + finalMin;

      console.log('Minutos inicio:', inicioMinutos, 'Minutos final:', finalMinutos);

      // Generar slots cada 30 minutos
      for (let minutos = inicioMinutos; minutos < finalMinutos; minutos += 30) {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;

        const horaFormateada = `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
        slots.push(horaFormateada);
      }
    } catch (error) {
      console.error('Error generando slots:', error);
    }

    console.log('Slots generados:', slots);
    return slots;
  };

  try {
    // Convertir fecha display a formato completo para consultas BD
    const fechaCompleta = convertirFechaDisplayACompleta(fechaDisplay);
    
    // CORRECCIÓN: Crear fecha local correctamente
    const [año, mes, dia] = fechaCompleta.split('-').map(Number);
    const fechaObj = new Date(año, mes - 1, dia, 12, 0, 0);
    const diaSemana = obtenerNombreDia(fechaObj.getDay());

    console.log('Fecha completa:', fechaCompleta);
    console.log('Día de la semana:', diaSemana);

    // Obtener horarios del especialista para ese día y especialidad
    const { data: horarios, error } = await this.sb.supabase
      .from('horarios_especialistas')
      .select('hora_inicio, hora_final')
      .eq('usuario_id', especialistaId)
      .eq('especialidad', especialidad)
      .eq('dia', diaSemana);

    console.log('Horarios encontrados:', horarios);

    if (error) {
      console.error('Error consultando horarios:', error);
      return [];
    }

    if (!horarios || horarios.length === 0) {
      console.log('No hay horarios para este día y especialidad');
      return [];
    }

    // Obtener turnos ya ocupados para esa fecha (usar formato completo)
    const { data: turnosOcupados, error: errorTurnos } = await this.sb.supabase
      .from('turnos')
      .select('hora')
      .eq('especialista_id', especialistaId)
      .eq('fecha', fechaCompleta)
      .eq('especialidad', especialidad)
      .neq('estado', 'cancelado');

    if (errorTurnos) {
      console.error('Error consultando turnos ocupados:', errorTurnos);
      return [];
    }

    const horasOcupadas = new Set(turnosOcupados?.map((t) => t.hora) || []);
    console.log('Horas ocupadas:', Array.from(horasOcupadas));

    // Generar slots de tiempo disponibles
    const horariosDisponibles: string[] = [];

    horarios.forEach((horario) => {
      const slots = generarSlotsHorarios(
        horario.hora_inicio,
        horario.hora_final
      );

      slots.forEach((slot) => {
        if (!horasOcupadas.has(slot)) {
          horariosDisponibles.push(slot);
        }
      });
    });

    console.log('Horarios finales disponibles:', horariosDisponibles);
    return horariosDisponibles.sort();

  } catch (error) {
    console.error('Error obteniendo horarios disponibles:', error);
    return [];
  }
}

  async crearTurno(turno: {
    paciente_id: number;
    especialista_id: number;
    especialidad: string;
    fecha: string; // Recibe formato DD/MM
    hora: string;
    estado: string;
  }): Promise<void> {
    // Función auxiliar interna: Convertir fecha display a completa
    const convertirFechaDisplayACompleta = (fechaDisplay: string): string => {
      const [dia, mes] = fechaDisplay.split('/').map(Number);
      const año = new Date().getFullYear();

      // Si el mes es menor al actual, asumir que es del próximo año
      const mesActual = new Date().getMonth() + 1;
      const añoFinal = mes < mesActual ? año + 1 : año;

      return `${añoFinal}-${mes.toString().padStart(2, '0')}-${dia
        .toString()
        .padStart(2, '0')}`;
    };

    // Convertir fecha display a formato completo para BD
    const fechaCompleta = convertirFechaDisplayACompleta(turno.fecha);

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

async cancelarTurno(turnoId: number, comentarioCancelacion: string): Promise<void> {
  const { data, error } = await this.sb.supabase
    .from('turnos')
    .update({
      estado: 'cancelado',
      comentario_cancelacion: comentarioCancelacion
    })
    .eq('id', turnoId);

  if (error) {
    console.error('Error al cancelar turno:', error);
    throw error;
  }

  console.log('Turno cancelado exitosamente:', data);
}

async rechazarTurno(turnoId: number, comentarioRechazo: string): Promise<void> {
  const { data, error } = await this.sb.supabase
    .from('turnos')
    .update({
      estado: 'rechazado',
      comentario_rechazo: comentarioRechazo
    })
    .eq('id', turnoId);

  if (error) {
    console.error('Error al rechazar turno:', error);
    throw error;
  }

  console.log('Turno rechazado exitosamente:', data);
}

async aceptarTurno(turnoId: number): Promise<void> {
  const { data, error } = await this.sb.supabase
    .from('turnos')
    .update({
      estado: 'aceptado'
    })
    .eq('id', turnoId);

  if (error) {
    console.error('Error al aceptar turno:', error);
    throw error;
  }

  console.log('Turno aceptado exitosamente:', data);
}

async finalizarTurno(datosFinalizacion: {
  turnoId: number;
  resena: string;
  diagnostico: string;
  altura_cm: number;
  peso_kg: number;
  temperatura_c: number;
  presion_arterial: string;
  datos_dinamicos: any;
}): Promise<void> {
  
  // Validar que no haya más de 3 datos dinámicos
  if (datosFinalizacion.datos_dinamicos) {
    const cantidadDatos = Object.keys(datosFinalizacion.datos_dinamicos).length;
    if (cantidadDatos > 3) {
      throw new Error('No se pueden agregar más de 3 datos dinámicos');
    }
  }

  const { data, error } = await this.sb.supabase
    .from('turnos')
    .update({
      estado: 'finalizado',
      comentario_especialista: datosFinalizacion.resena,
      diagnostico: datosFinalizacion.diagnostico,
      altura_cm: datosFinalizacion.altura_cm,
      peso_kg: datosFinalizacion.peso_kg,
      temperatura_c: datosFinalizacion.temperatura_c,
      presion_arterial: datosFinalizacion.presion_arterial,
      datos_dinamicos: datosFinalizacion.datos_dinamicos || {}
    })
    .eq('id', datosFinalizacion.turnoId);

  if (error) {
    console.error('Error al finalizar turno:', error);
    throw error;
  }

  console.log('Turno finalizado exitosamente:', data);
}

async completarEncuesta(turnoId: number, encuesta: any): Promise<void> {
  const { data, error } = await this.sb.supabase
    .from('turnos')
    .update({
      encuesta: encuesta
    })
    .eq('id', turnoId);

  if (error) {
    console.error('Error al completar encuesta:', error);
    throw error;
  }

  console.log('Encuesta completada exitosamente:', data);
}

async calificarAtencion(turnoId: number, puntaje: number, comentarioAtencion: string): Promise<void> {
  const { data, error } = await this.sb.supabase
    .from('turnos')
    .update({
      puntaje: puntaje
    })
    .eq('id', turnoId);

  if (error) {
    console.error('Error al calificar atención:', error);
    throw error;
  }

  console.log('Atención calificada exitosamente:', data);
}

async obtenerTurnoCompleto(turnoId: number): Promise<any> {
  const { data, error } = await this.sb.supabase
    .from('turnos')
    .select(`
      *,
      paciente:paciente_id (
        nombre,
        apellido,
        obra_social,
        imagen_perfil_1,
        imagen_perfil_2
      ),
      especialista:especialista_id (
        nombre,
        apellido,
        especialidades,
        imagen_perfil_1
      )
    `)
    .eq('id', turnoId)
    .single();

  if (error) {
    console.error('Error al obtener turno completo:', error);
    throw error;
  }

  return data;
}

async obtenerTurnosConDetalles(tipoUsuario: 'paciente' | 'especialista', usuarioId: number): Promise<any[]> {
  let query = this.sb.supabase
    .from('turnos')
    .select(`
      *,
      paciente:paciente_id (
        nombre,
        apellido,
        obra_social,
        imagen_perfil_1,
        imagen_perfil_2
      ),
      especialista:especialista_id (
        nombre,
        apellido,
        especialidades,
        imagen_perfil_1
      )
    `);

  // Aplicar filtro según el tipo de usuario
  if (tipoUsuario === 'paciente') {
    query = query.eq('paciente_id', usuarioId);
  } else {
    query = query.eq('especialista_id', usuarioId);
  }

  const { data, error } = await query
    .order('fecha', { ascending: false })
    .order('hora', { ascending: false });

  if (error) {
    console.error(`Error al obtener turnos del ${tipoUsuario} con detalles:`, error);
    throw error;
  }

  return data || [];
}

// 1. Logs de ingreso
getLogsIngreso() {
  return this.sb.supabase
    .from('logs_ingreso')
    .select('usuario_id, email, fecha_ingreso, timestamp');
}

// 2. Turnos por especialidad
getTurnosPorEspecialidad() {
  return this.sb.supabase
    .from('turnos')
    .select('especialidad, count:id')
}

// 3. Turnos por día
getTurnosPorDia() {
  return this.sb.supabase
    .from('turnos')
    .select('fecha, count:id')
}

// 4. Turnos por médico en rango de fechas
getTurnosPorMedico(fechaInicio: string, fechaFin: string) {
  return this.sb.supabase
    .from('turnos')
    .select('especialista_id, count:id')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
}

// 5. Turnos finalizados por médico en rango de fechas
getTurnosFinalizadosPorMedico(fechaInicio: string, fechaFin: string) {
  return this.sb.supabase
    .from('turnos')
    .select('especialista_id, count:id')
    .eq('estado', 'finalizado')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
}

getTodosLosTurnos() {
  return this.sb.supabase
    .from('turnos')
    .select('id, fecha, estado, especialidad, especialista_id');
}

async getLogsIngresoConUsuarios(): Promise<any[]> {
  const { data, error } = await this.sb.supabase
    .from('logs_ingreso')
    .select(`
      *,
      usuario:usuario_id (
        nombre,
        apellido,
        email,
        perfil
      )
    `)
    .order('timestamp', { ascending: false }) // Cambiado de fecha_ingreso a timestamp
    .limit(100); // Aumentado el límite para obtener más registros

  if (error) {
    console.error('Error al obtener logs con usuarios:', error);
    return [];
  }

  console.log('Datos obtenidos de logs_ingreso:', data); // Debug temporal
  return data || [];
}

}
