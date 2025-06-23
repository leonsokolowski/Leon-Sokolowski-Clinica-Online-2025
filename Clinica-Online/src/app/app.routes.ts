import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegistroComponent } from './pages/registro/registro.component';
import { RegistroUsuariosComponent } from './pages/registro-usuarios/registro-usuarios.component';
import { RegistroEspecialistasComponent } from './pages/registro-especialistas/registro-especialistas.component';
import { SeccionUsuariosComponent } from './pages/seccion-usuarios/seccion-usuarios.component';
import { ErrorComponent } from './pages/error/error.component';
import { RegistroAdminsComponent } from './pages/registro-admins/registro-admins.component';
import { AdministracionEspecialistasComponent } from './pages/administracion-especialistas/administracion-especialistas.component';
import { MiPerfilComponent } from './pages/mi-perfil/mi-perfil.component';
import { SolicitarTurnoComponent } from './pages/solicitar-turno/solicitar-turno.component';
import { MisTurnosComponent } from './pages/mis-turnos/mis-turnos.component';
import { TurnosComponent } from './pages/turnos/turnos.component';
import { HistoriaClinicaComponent } from './pages/historia-clinica/historia-clinica.component';
import { SeccionPacientesComponent } from './pages/seccion-pacientes/seccion-pacientes.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, title: 'Ingreso' },
  { path: 'registro', component: RegistroComponent, title: 'Registro' },
  {
    path: 'registro-usuarios',
    component: RegistroUsuariosComponent,
    title: 'Registro Usuario',
  },
  {
    path: 'registro-especialistas',
    component: RegistroEspecialistasComponent,
    title: 'Registro Especialista',
  },
  { path: 'home', component: HomeComponent, title: 'Home' },
  {
    path: 'seccion-usuarios',
    component: SeccionUsuariosComponent,
    title: 'Sección Usuarios',
  },
  {
    path: 'registro-admins',
    component: RegistroAdminsComponent,
    title: 'Registro admins',
  },
  {
    path: 'administracion-especialistas',
    component: AdministracionEspecialistasComponent,
    title: 'Administración Especialistas',
  },
  { 
    path: 'mi-perfil', 
    component: MiPerfilComponent, 
    title: 'Mi perfil',
    children: [
      {
        path: 'historia-clinica',
        component: HistoriaClinicaComponent,
        title: 'Mi Historia Clínica'
      }
    ]
  },
  { path: 'solicitar-turno', component: SolicitarTurnoComponent, title: 'Solicitar Turno' },
  { path: 'mis-turnos', component: MisTurnosComponent, title: 'Mis Turnos' },
  { path: 'turnos', component: TurnosComponent, title: 'Turnos' },
  { 
    path: 'seccion-pacientes', 
    component: SeccionPacientesComponent, 
    title: 'Sección Pacientes' 
  },
  // Rutas independientes para administradores y especialistas
  { 
    path: 'historia-clinica/:pacienteId', 
    component: HistoriaClinicaComponent, 
    title: 'Historia Clínica' 
  },
  // Mantener esta ruta como alternativa (ya no es necesaria pero por compatibilidad)
  { 
    path: 'mi-historia-clinica', 
    component: HistoriaClinicaComponent, 
    title: 'Mi Historia Clínica' 
  },
  { path: '**', component: ErrorComponent, title: 'ERROR' },
];