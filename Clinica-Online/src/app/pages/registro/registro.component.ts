import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-registro',
  standalone : true,
  imports: [],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css'
})
export class RegistroComponent {
  router = inject(Router);
  navigateToUsuarios()
  {
    this.router.navigateByUrl('/registro-usuarios');
  }
  navigateToEspecialistas()
  {
    this.router.navigateByUrl('/registro-especialistas');

  }
}
