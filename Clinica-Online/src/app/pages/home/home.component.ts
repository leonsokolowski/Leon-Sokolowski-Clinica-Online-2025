import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../clases/usuario';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit{
  auth = inject(AuthService);
  db = inject(DatabaseService);
  perfil : string | undefined = "";
  usuario: Usuario | null = null;

  ngOnInit(): void {
    this.definirPerfil();
  }

  async definirPerfil()
  {
    const email = this.auth.usuarioActual?.email;

    if (!email) {
        console.log('No se pudo obtener el email del usuario');
        return;
      }

    this.usuario = await this.db.obtenerUsuarioPorEmail(email);
    this.perfil = this.usuario?.perfil;
  }
}
