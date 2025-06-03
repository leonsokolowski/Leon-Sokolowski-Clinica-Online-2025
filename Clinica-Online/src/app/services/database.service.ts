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

  // NUEVO: Método para eliminar usuario de la base de datos
  async eliminarUsuario(email: string): Promise<void> {
    const { error } = await this.sb.supabase
      .from('usuarios')
      .delete()
      .eq('email', email);
    
    if (error) {
      console.error('Error al eliminar usuario:', error);
      throw error;
    }
    
    console.log('Usuario eliminado exitosamente de la base de datos');
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
  
}