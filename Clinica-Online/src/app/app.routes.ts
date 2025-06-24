import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { ErrorComponent } from './pages/error/error.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, title: 'Ingreso' },
  { path: 'home', component: HomeComponent, title: 'Home' },
  
  // Módulo de Registro (Lazy Loading)
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.component').then(m => m.RegistroComponent),
    title: 'Registro'
  },
  {
    path: 'registro-usuarios',
    loadComponent: () => import('./pages/registro-usuarios/registro-usuarios.component').then(m => m.RegistroUsuariosComponent),
    title: 'Registro Usuario'
  },
  {
    path: 'registro-especialistas',
    loadComponent: () => import('./pages/registro-especialistas/registro-especialistas.component').then(m => m.RegistroEspecialistasComponent),
    title: 'Registro Especialista'
  },

  // Módulo de Administración (Lazy Loading)
  {
    path: 'seccion-usuarios',
    loadComponent: () => import('./pages/seccion-usuarios/seccion-usuarios.component').then(m => m.SeccionUsuariosComponent),
    title: 'Sección Usuarios'
  },
  {
    path: 'registro-admins',
    loadComponent: () => import('./pages/registro-admins/registro-admins.component').then(m => m.RegistroAdminsComponent),
    title: 'Registro admins'
  },
  {
    path: 'administracion-especialistas',
    loadComponent: () => import('./pages/administracion-especialistas/administracion-especialistas.component').then(m => m.AdministracionEspecialistasComponent),
    title: 'Administración Especialistas'
  },

  // Módulo de Perfil (Lazy Loading)
  {
    path: 'mi-perfil',
    loadComponent: () => import('./pages/mi-perfil/mi-perfil.component').then(m => m.MiPerfilComponent),
    title: 'Mi perfil',
    children: [
      {
        path: 'historia-clinica',
        loadComponent: () => import('./pages/historia-clinica/historia-clinica.component').then(m => m.HistoriaClinicaComponent),
        title: 'Mi Historia Clínica'
      }
    ]
  },

  // Módulo de Turnos (Lazy Loading)
  {
    path: 'solicitar-turno',
    loadComponent: () => import('./pages/solicitar-turno/solicitar-turno.component').then(m => m.SolicitarTurnoComponent),
    title: 'Solicitar Turno'
  },
  {
    path: 'mis-turnos',
    loadComponent: () => import('./pages/mis-turnos/mis-turnos.component').then(m => m.MisTurnosComponent),
    title: 'Mis Turnos'
  },
  {
    path: 'turnos',
    loadComponent: () => import('./pages/turnos/turnos.component').then(m => m.TurnosComponent),
    title: 'Turnos'
  },

  // Módulo de Pacientes (Lazy Loading)
  {
    path: 'seccion-pacientes',
    loadComponent: () => import('./pages/seccion-pacientes/seccion-pacientes.component').then(m => m.SeccionPacientesComponent),
    title: 'Sección Pacientes'
  },

  // Rutas de Historia Clínica (Lazy Loading)
  {
    path: 'historia-clinica/:pacienteId',
    loadComponent: () => import('./pages/historia-clinica/historia-clinica.component').then(m => m.HistoriaClinicaComponent),
    title: 'Historia Clínica'
  },

  { path: '**', component: ErrorComponent, title: 'ERROR' }
];