import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { User } from '@supabase/supabase-js';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  sb = inject(SupabaseService)
  router = inject(Router)
  usuarioActual : User | null = null;
  perfilUsuario: string = ""; // Nueva propiedad para el perfil
  
  // Flag para controlar si se debe hacer redirección automática
  private permitirRedireccionAutomatica: boolean = true;
  
  constructor() {
    //Saber si el usuario esta logeado o no
    this.sb.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session);

      if (session === null) //Se cierra sesión o no hay sesion
      {
        this.usuarioActual = null;
        this.perfilUsuario = ""; // Limpiar perfil al cerrar sesión
        
        // Solo redirigir si está permitido
        if (this.permitirRedireccionAutomatica) {
          const currentUrl = this.router.url;
          if(currentUrl === '/registro')
          {
            this.router.navigateByUrl("/registro");
          }else if(currentUrl === '/registro-usuarios')
          {
            this.router.navigateByUrl("/registro-usuarios");
          }else if(currentUrl === '/registro-especialistas')
          {
            this.router.navigateByUrl("/registro-especialistas");
          }else
          {
            this.router.navigateByUrl("/login");
          }
        }
      }else{ //si hay sesion
        this.usuarioActual = session.user;
        
        // Obtener el perfil del usuario
        await this.obtenerPerfilUsuario(session.user.email!);
        
        // Solo redirigir si está permitido
        if (this.permitirRedireccionAutomatica) {
          const currentUrl = this.router.url;

          if (currentUrl === '/login' || currentUrl === '/registro' || currentUrl === '/registro/usuarios' || currentUrl === '/registro/especialistas' || currentUrl === '/') {
            // Verificar si el usuario puede acceder al home
            const puedeAccederHome = await this.verificarAccesoHome(session.user.email!);
            
            if (puedeAccederHome) {
              //redigir al home
              this.router.navigateByUrl("/home");
            }
          }
        }
      }
    });
   }

  // Método para obtener el usuario actual con datos completos de la base de datos
  async obtenerUsuarioActual(): Promise<any | null> {
    try {
      if (!this.usuarioActual) {
        return null;
      }

      const { data, error } = await this.sb.supabase
        .from('usuarios')
        .select('*')
        .eq('email', this.usuarioActual.email!)
        .single();
      
      if (error) {
        console.error('Error al obtener usuario actual:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error al obtener usuario actual:', error);
      return null;
    }
  }

  // Nuevo método para obtener el perfil del usuario
  private async obtenerPerfilUsuario(email: string): Promise<void> {
    try {
      const { data, error } = await this.sb.supabase
        .from('usuarios')
        .select('perfil')
        .eq('email', email)
        .single();
      
      if (error) {
        console.error('Error al obtener perfil del usuario:', error);
        this.perfilUsuario = "";
        return;
      }

      this.perfilUsuario = data?.perfil || "";
      console.log('Perfil del usuario:', this.perfilUsuario);
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      this.perfilUsuario = "";
    }
  }

  // Verificar si el usuario puede acceder al home
  private async verificarAccesoHome(email: string): Promise<boolean> {
    try {
      // Hacer la consulta directamente a Supabase para evitar dependencia circular
      const { data, error } = await this.sb.supabase
        .from('usuarios')
        .select('perfil, habilitado')
        .eq('email', email)
        .single();
      
      if (error || !data) {
        console.error('Error al obtener datos del usuario:', error);
        return false;
      }

      // Si es paciente o admin, puede acceder
      if (data.perfil === 'paciente' || data.perfil === 'admin') {
        return true;
      }

      // Si es especialista, verificar que esté habilitado
      if (data.perfil === 'especialista') {
        return data.habilitado === true;
      }

      return false;
    } catch (error) {
      console.error('Error al verificar acceso al home:', error);
      return false;
    }
  }

  // Método para deshabilitar temporalmente la redirección automática
  deshabilitarRedireccionAutomatica(): void {
    this.permitirRedireccionAutomatica = false;
  }

  // Método para rehabilitar la redirección automática
  habilitarRedireccionAutomatica(): void {
    this.permitirRedireccionAutomatica = true;
  }

  //Crear un cuenta
  async crearCuenta(correo: string, contraseña: string) {
    const { data, error } = await this.sb.supabase.auth.signUp({
      email: correo, 
      password: contraseña
    });
    
    if (error) {
      console.error('Error al crear cuenta:', error);
      throw error;
    }
    
    console.log('Cuenta creada exitosamente:', data);
    return { data, error };
  }

  //Crear cuenta para registro de admins/especialistas (sin redirecciones automáticas)
  async crearCuentaParaRegistro(correo: string, contraseña: string) {
    // Deshabilitar redirecciones automáticas temporalmente
    this.deshabilitarRedireccionAutomatica();
    
    try {
      const { data, error } = await this.sb.supabase.auth.signUp({
        email: correo, 
        password: contraseña
      });
      
      if (error) {
        console.error('Error al crear cuenta:', error);
        throw error;
      }
      
      console.log('Cuenta creada exitosamente para registro:', data);
      return { data, error };
    } finally {
      // Rehabilitar redirecciones automáticas después de un pequeño delay
      setTimeout(() => {
        this.habilitarRedireccionAutomatica();
      }, 1000);
    }
  }

  //Iniciar sesión
  async iniciarSesion(correo: string, contraseña: string) {
    const { data, error } = await this.sb.supabase.auth.signInWithPassword({
      email: correo, 
      password: contraseña
    });
    
    if (error) {
      console.error('Error al iniciar sesión:', error);
      return { data, error };
    }

    // Verificar si puede acceder al home después del login
    if (data.user) {
      const puedeAccederHome = await this.verificarAccesoHome(data.user.email!);
      
      if (puedeAccederHome) {
        // Redirigir al home si puede acceder
        setTimeout(() => {
          this.router.navigateByUrl("/home");
        }, 100);
      }
    }
    
    console.log('Inicio de sesión:', data, error);
    return { data, error };
  }

  //Cerrar sesión
  async cerrarSesion() {
    console.log('Iniciando cierre de sesión...');
    const { error } = await this.sb.supabase.auth.signOut();
    
    if (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    } else {
      console.log('Sesión cerrada exitosamente');
    }
  }

  // Cerrar sesión para registros (sin esperar y sin lanzar errores)
  async cerrarSesionParaRegistro(): Promise<void> {
    try {
      console.log('Cerrando sesión para registro...');
      await this.sb.supabase.auth.signOut();
      console.log('Sesión cerrada exitosamente para registro');
    } catch (error) {
      console.error('Error al cerrar sesión para registro:', error);
      // No lanzar el error para no interrumpir el proceso de registro
    }
  }

  // Método auxiliar para verificar si un usuario está habilitado
  async usuarioEstaHabilitado(email: string): Promise<boolean> {
    return await this.verificarAccesoHome(email);
  }
}