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
  { path: '**', component: ErrorComponent, title: 'ERROR' },
];
