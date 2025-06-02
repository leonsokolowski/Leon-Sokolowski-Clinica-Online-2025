import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-esperando-habilitacion',
  imports: [],
  templateUrl: './esperando-habilitacion.component.html',
  styleUrl: './esperando-habilitacion.component.css'
})
export class EsperandoHabilitacionComponent implements OnInit{
  auth = inject(AuthService);
  constructor(private router: Router) { }

  ngOnInit() : void {

    setTimeout(() => {
      this.auth.cerrarSesion();
    }, 10000);

  }
}
