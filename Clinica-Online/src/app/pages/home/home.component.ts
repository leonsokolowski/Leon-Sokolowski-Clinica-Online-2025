import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../clases/usuario';
import { CommonModule } from '@angular/common';
import { trigger, style, transition, animate } from '@angular/animations';
import { SubrayadoDirective } from '../../directives/subrayado.directive';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule, SubrayadoDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('800ms ease-in', style({ opacity: 1 }))
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('800ms 400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class HomeComponent implements OnInit {
  auth = inject(AuthService);
  db = inject(DatabaseService);
  perfil: string | undefined = "";
  nombre: string | undefined = "";
  usuario: Usuario | null = null;

  ngOnInit(): void {
    this.definirusuario();
  }

  async definirusuario() {
    this.usuario = await this.auth.obtenerUsuarioActual();
    this.perfil = this.usuario?.perfil;
    this.nombre = this.usuario?.nombre;
  }

  obtenerConfiguracionBotones() {
    switch(this.perfil) {
      case 'admin':
        return [
          { texto: 'Solicitar Turno', ruta: '/solicitar-turno', icono: 'fas fa-calendar-plus' },
          { texto: 'Gestionar Turnos', ruta: '/turnos', icono: 'fas fa-tasks' },
          { texto: 'Mi Perfil', ruta: '/mi-perfil', icono: 'fas fa-user-cog' }
        ];
      case 'paciente':
        return [
          { texto: 'Solicitar Turno', ruta: '/solicitar-turno', icono: 'fas fa-calendar-plus' },
          { texto: 'Mis Turnos', ruta: '/mis-turnos', icono: 'fas fa-calendar-check' },
          { texto: 'Mi Perfil', ruta: '/mi-perfil', icono: 'fas fa-user' }
        ];
      case 'especialista':
        return [
          { texto: 'Mis Turnos', ruta: '/mis-turnos', icono: 'fas fa-calendar-check' },
          { texto: 'Sección Pacientes', ruta: '/seccion-pacientes', icono: 'fas fa-user-injured' },
          { texto: 'Mi Perfil', ruta: '/mi-perfil', icono: 'fas fa-user-md' }
        ];
      default:
        return [
          { texto: 'Mi Perfil', ruta: '/mi-perfil', icono: 'fas fa-user' }
        ];
    }
  }

  // Función para el trackBy del ngFor
  seguimientoPorRuta(indice: number, elemento: any): string {
    return elemento.ruta;
  }
}