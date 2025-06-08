import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Usuario, Paciente, Especialista, Admin } from '../clases/usuario';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  sb = inject(SupabaseService);
  
  async listarUsuarios(): Promise<Usuario[]> {
    const { data, error } = await this.sb.supabase.from('usuarios').select('*');
    if (error) {
      console.error('Error al listar usuarios:', error);
      throw error;
    }
    return data as Usuario[];
  }

  async obtenerUsuarioPorEmail(email: string): Promise<Usuario | null> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error al obtener usuario:', error);
      throw error;
    }
    
    return data as Usuario | null;
  }

  async obtenerUsuarioPorDni(dni: string): Promise<Usuario | null> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .select('*')
      .eq('dni', dni)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error al obtener usuario por DNI:', error);
      throw error;
    }
    
    return data as Usuario | null;
  }

  async verificarUsuarioExistente(email: string, dni: string, nombre: string, apellido: string): Promise<boolean> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .select('email, dni, nombre, apellido')
      .or(`email.eq.${email},dni.eq.${dni},and(nombre.eq.${nombre},apellido.eq.${apellido})`);
    
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
      habilitado: paciente.habilitado
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
      habilitado: false // Los especialistas se registran como no habilitados por defecto
    };

    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .insert(userData);
    
    if (error) {
      console.error('Error al registrar especialista:', error);
      throw error;
    }
    
    console.log('Especialista registrado exitosamente (pendiente de habilitación):', data);
  }

  // Método para habilitar un especialista (solo para admins)
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

  // Método para deshabilitar un especialista (solo para admins)
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

  // Obtener todos los especialistas pendientes de habilitación
  async obtenerEspecialistasPendientes(): Promise<Usuario[]> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .select('*')
      .eq('perfil', 'especialista')
      .eq('habilitado', false);
    
    if (error) {
      console.error('Error al obtener especialistas pendientes:', error);
      throw error;
    }
    
    return data as Usuario[];
  }

  // MODIFICADO: Método para eliminar usuario completo (BD + Storage)
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

  // NUEVO: Método para eliminar imágenes del usuario del storage
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

  // NUEVO: Método para extraer el path de una URL de Supabase Storage
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

  // NUEVO: Método para obtener usuarios por perfil
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

  // NUEVO: Método para obtener pacientes
  async obtenerPacientes(): Promise<Paciente[]> {
    return await this.obtenerUsuariosPorPerfil('paciente') as Paciente[];
  }

  // NUEVO: Método para obtener especialistas
  async obtenerEspecialistas(): Promise<Especialista[]> {
    return await this.obtenerUsuariosPorPerfil('especialista') as Especialista[];
  }

  // NUEVO: Método para actualizar datos de usuario
  async actualizarUsuario(email: string, datosActualizados: Partial<Usuario>): Promise<void> {
    const { data, error } = await this.sb.supabase
      .from('usuarios')
      .update(datosActualizados)
      .eq('email', email);
    
    if (error) {
      console.error('Error al actualizar usuario:', error);
      throw error;
    }
    
    console.log('Usuario actualizado exitosamente:', data);
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
      habilitado: admin.habilitado // true por defecto para admins
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

  async obtenerHorariosEspecialista(usuarioId: number): Promise<any[]> {
    const { data, error } = await this.sb.supabase
      .from('horarios_especialistas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('especialidad', { ascending: true })
      .order('dia', { ascending: true });
    
    if (error) {
      console.error('Error al obtener horarios del especialista:', error);
      throw error;
    }
    
    return data || [];
  }

  // Método para guardar horarios de especialista
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

  // Método para actualizar horarios de especialista
  async actualizarHorariosEspecialista(usuarioId: number, horarios: any[]): Promise<void> {
    // Primero eliminar los horarios existentes
    await this.eliminarHorariosEspecialista(usuarioId);
    
    // Luego insertar los nuevos horarios
    await this.guardarHorariosEspecialista(horarios);
  }

  // Método para eliminar horarios de especialista
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

  // Método para verificar disponibilidad de horarios (evitar superposiciones)
  async verificarDisponibilidadHorario(usuarioId: number, especialidad: string, dia: string, horaInicio: string, horaFinal: string): Promise<boolean> {
    const { data, error } = await this.sb.supabase
      .from('horarios_especialistas')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('dia', dia)
      .neq('especialidad', especialidad);
    
    if (error) {
      console.error('Error al verificar disponibilidad:', error);
      return false;
    }
    
    if (!data || data.length === 0) {
      return true;
    }
    
    const inicio = parseInt(horaInicio);
    const final = parseInt(horaFinal);
    
    // Verificar superposiciones con horarios existentes
    for (const horario of data) {
      const inicioExistente = parseInt(horario.hora_inicio.split(':')[0]);
      const finalExistente = parseInt(horario.hora_final.split(':')[0]);
      
      // Si hay superposición
      if (inicio < finalExistente && final > inicioExistente) {
        return false;
      }
    }
    
    return true;
  } 
}