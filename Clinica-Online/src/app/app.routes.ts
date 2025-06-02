import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegistroComponent } from './pages/registro/registro.component';
import { RegistroUsuariosComponent } from './pages/registro-usuarios/registro-usuarios.component';
import { RegistroEspecialistasComponent } from './pages/registro-especialistas/registro-especialistas.component';
import { SeccionUsuariosComponent } from './pages/seccion-usuarios/seccion-usuarios.component';
import { ErrorComponent } from './pages/error/error.component';
import { EsperandoHabilitacionComponent } from './pages/esperando-habilitacion/esperando-habilitacion.component';

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
  {
    path: 'esperando-habilitacion',
    component: EsperandoHabilitacionComponent,
    title: 'Esperando habilitación...',
  },
  { path: 'home', component: HomeComponent, title: 'Home' },
  {
    path: 'seccion-usuarios',
    component: SeccionUsuariosComponent,
    title: 'Sección Usuarios',
  },
  { path: '**', component: ErrorComponent, title: 'ERROR' },
];
