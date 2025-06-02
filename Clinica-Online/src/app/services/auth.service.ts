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
  
  constructor() {
    //Saber si el usuario esta logeado o no
    this.sb.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(event, session);

      if (session === null) //Se cierra sesión o no hay sesion
      {
        this.usuarioActual = null;
        //redirigir al login
        this.router.navigateByUrl("/login");
      }else{ //si hay sesion
        this.usuarioActual = session.user;
        const currentUrl = this.router.url;

        if (currentUrl === '/login' || currentUrl === '/registro' || currentUrl === '/registro/usuarios' || currentUrl === '/registro/especialistas' || currentUrl === '/') {
          // Verificar si el usuario puede acceder al home
          const puedeAccederHome = await this.verificarAccesoHome(session.user.email!);
          
          if (puedeAccederHome) {
            //redigir al home
            this.router.navigateByUrl("/home");
          } else {
            // Si es especialista no habilitado, redirigir a página de espera
            this.router.navigateByUrl("/esperando-habilitacion");
          }
        }
      }
    });
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
      
      if (!puedeAccederHome) {
        // Si no puede acceder, redirigir a página de espera
        setTimeout(() => {
          this.router.navigateByUrl("/esperando-habilitacion");
        }, 100);
      }
    }
    
    console.log('Inicio de sesión:', data, error);
    return { data, error };
  }

  //Cerrar sesión
  async cerrarSesion() {
    const { error } = await this.sb.supabase.auth.signOut();
    
    if (error) {
      console.error('Error al cerrar sesión:', error);
    }
    
    console.log('Sesión cerrada');
  }

  // Método auxiliar para verificar si un usuario está habilitado
  async usuarioEstaHabilitado(email: string): Promise<boolean> {
    return await this.verificarAccesoHome(email);
  }
}