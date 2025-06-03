import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-seccion-usuarios',
  imports: [],
  templateUrl: './seccion-usuarios.component.html',
  styleUrl: './seccion-usuarios.component.css'
})
export class SeccionUsuariosComponent {
  router = inject(Router);

  navigateToRegistroAdmins() {
    this.router.navigateByUrl('/registro-admins');
  }

  navigateToAdministracionEspecialistas() {
    this.router.navigateByUrl('/administracion-especialistas');
  }
}