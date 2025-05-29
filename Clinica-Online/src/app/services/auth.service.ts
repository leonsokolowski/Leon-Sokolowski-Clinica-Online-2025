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
    this.sb.supabase.auth.onAuthStateChange((event, session) => {
      console.log(event, session);

      if (session === null) //Se cierra sesión o no hay sesion
      {
        this.usuarioActual = null;
        //redirigir al login
        this.router.navigateByUrl("/login");
      }else{ //si hay sesion
        this.usuarioActual = session.user;
        const currentUrl = this.router.url;

        if (currentUrl === '/login' || currentUrl === '/registro' || currentUrl === '/') {
          //redigir al home
          this.router.navigateByUrl("/home");
        }
      }
    });
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
}