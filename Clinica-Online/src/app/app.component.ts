import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { AuthService } from './services/auth.service';
import { DatabaseService } from './services/database.service';
import { Usuario } from './clases/usuario';
import { filter } from 'rxjs/operators';

interface NavButton {
  route: string;
  text: string;
  iconClass: string;
  cssClass: string;
  allowedProfiles: string[];
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Clinica-Online';
  auth = inject(AuthService);
  db = inject(DatabaseService);
  router = inject(Router);
  
  currentRoute: string = '';
  
  // Definición completa de todos los botones de navegación
  private allNavButtons: NavButton[] = [
    {
      route: '/home',
      text: 'Home',
      iconClass: 'fas fa-home',
      cssClass: 'btn-home',
      allowedProfiles: ['admin', 'paciente', 'especialista']
    },
    {
      route: '/mi-perfil',
      text: 'Mi Perfil',
      iconClass: 'fas fa-user',
      cssClass: 'btn-profile',
      allowedProfiles: ['admin', 'paciente', 'especialista']
    },
    {
      route: '/solicitar-turno',
      text: 'Solicitar Turno',
      iconClass: 'fas fa-calendar-plus',
      cssClass: 'btn-appointment',
      allowedProfiles: ['admin', 'paciente']
    },
    {
      route: '/mis-turnos',
      text: 'Mis Turnos',
      iconClass: 'fas fa-calendar-check',
      cssClass: 'btn-my-appointments',
      allowedProfiles: ['paciente', 'especialista']
    },
    {
      route: '/turnos',
      text: 'Turnos',
      iconClass: 'fas fa-calendar-alt',
      cssClass: 'btn-all-appointments',
      allowedProfiles: ['admin']
    },
    {
      route: '/seccion-pacientes',
      text: 'Sección Pacientes',
      iconClass: 'fas fa-users',
      cssClass: 'btn-patients',
      allowedProfiles: ['especialista']
    },
    {
      route: '/seccion-usuarios',
      text: 'Administración',
      iconClass: 'fas fa-cogs',
      cssClass: 'btn-admin',
      allowedProfiles: ['admin']
    },
    {
      route: '/estadisticas',
      text: 'Estadísticas',
      iconClass: 'fas fa-chart-bar',
      cssClass: 'btn-statistics',
      allowedProfiles: ['admin']
    }
  ];

  ngOnInit() {
    // Escuchar cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
    });
    
    // Establecer ruta inicial
    this.currentRoute = this.router.url;
  }

  logOut() {
    this.auth.cerrarSesion();
  }

  // Getter para acceder al perfil del usuario desde el template
  get perfil_usuario(): string {
    return this.auth.perfilUsuario;
  }

  // Getter para obtener los botones que deben mostrarse
  get visibleNavButtons(): NavButton[] {
    const currentProfile = this.perfil_usuario;
    
    return this.allNavButtons.filter(button => {
      // No mostrar si no está permitido para el perfil actual
      if (!button.allowedProfiles.includes(currentProfile)) {
        return false;
      }
      
      // No mostrar el botón de la ruta actual
      if (this.currentRoute === button.route) {
        return false;
      }
      
      // Si estamos en home, no mostrar ciertos botones
      if (this.currentRoute === '/home') {
        const hiddenInHome = ['/mi-perfil', '/solicitar-turno', '/mis-turnos', '/turnos', '/seccion-pacientes'];
        if (hiddenInHome.includes(button.route)) {
          return false;
        }
      }
      
      return true;
    });
  }
}