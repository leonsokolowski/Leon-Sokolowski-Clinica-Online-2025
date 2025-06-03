import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { DatabaseService } from './services/database.service';
import { Usuario } from './clases/usuario';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit{
  title = 'Clinica-Online';
  auth = inject(AuthService);
  db = inject(DatabaseService);

  ngOnInit(): void {
    // Ya no necesitamos hacer nada aquí, el AuthService maneja todo
  }

  logOut()
  {
    this.auth.cerrarSesion();
  }

  // Getter para acceder al perfil del usuario desde el template
  get perfil_usuario(): string {
    return this.auth.perfilUsuario;
  }
}