import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DatabaseService } from '../../services/database.service';

interface UsuarioAccesoRapido {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  imagen: string;
  perfil: 'admin' | 'especialista' | 'paciente';
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private databaseService = inject(DatabaseService);

  registroForm!: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';
  usuarioSeleccionado: string = ''; // Para manejar el estado visual del botón seleccionado

  // Usuarios para acceso rápido
  usuariosAccesoRapido: UsuarioAccesoRapido[] = [
    {
      email: 'admin@admin.com',
      password: 'Admin123',
      nombre: 'Admin',
      apellido: 'Principal',
      imagen: 'admins/admin@admin.com/imagen_perfil_1.png',
      perfil: 'admin'
    },
    {
      email: 'especialista1@clinica.com',
      password: 'Esp123456',
      nombre: 'Juan',
      apellido: 'Pérez',
      imagen: 'especialistas/especialista1@clinica.com/imagen_perfil_1748829932380.png',
      perfil: 'especialista'
    },
    {
      email: 'especialista2@clinica.com',
      password: 'Esp123456',
      nombre: 'María',
      apellido: 'González',
      imagen: 'especialistas/especialista2@clinica.com/imagen_perfil_1748832200019.png',
      perfil: 'especialista'
    },
    {
      email: 'paciente1@email.com',
      password: 'Pac123456',
      nombre: 'Carlos',
      apellido: 'Martínez',
      imagen: 'usuarios/paciente1@email.com/imagen_1_1748832662442.png',
      perfil: 'paciente'
    },
    {
      email: 'paciente2@email.com',
      password: 'Pac123456',
      nombre: 'Rocio',
      apellido: 'de Brito',
      imagen: 'usuarios/paciente2@email.com/imagen_1_1748832992917.png',
      perfil: 'paciente'
    },
    {
      email: 'paciente3@email.com',
      password: 'Pac123456',
      nombre: 'Luis',
      apellido: 'Rodríguez',
      imagen: 'usuarios/paciente3@email.com/imagen_1_1748833345335.png',
      perfil: 'paciente'
    }
  ];

  ngOnInit(): void {
    this.registroForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contraseña: ['', [Validators.required, Validators.minLength(6), Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/)]]
    });
  }

  get f() {
    return this.registroForm.controls;
  }

  async ingresar() {
    if (this.registroForm.valid) {
      this.errorMessage = '';
      this.successMessage = '';

      const email = this.registroForm.value.correo;
      const password = this.registroForm.value.contraseña;

      try {
        // 1. Verificar si el usuario existe en la base de datos
        const usuario = await this.databaseService.obtenerUsuarioPorEmail(email);
        
        if (!usuario) {
          this.errorMessage = 'Credenciales inválidas.';
          return;
        }

        // 2. Si es especialista, verificar que esté habilitado
        if (usuario.perfil === 'especialista') {
          if (!usuario.habilitado) {
            this.errorMessage = 'Su cuenta de especialista aún no ha sido habilitada por un administrador.';
            return;
          }
        }

        // 3. Proceder con el inicio de sesión normal
        const { data, error } = await this.authService.iniciarSesion(email, password);

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            this.errorMessage = 'Credenciales inválidas.';
          } else {
            this.errorMessage = 'Error al iniciar sesión: ' + error.message;
          }
        } else {
          this.successMessage = 'Inicio de sesión exitoso.';
          // La redirección se maneja automáticamente en AuthService
        }

      } catch (error) {
        console.error('Error durante el inicio de sesión:', error);
        this.errorMessage = 'Error interno. Intente nuevamente.';
      }
    }
  }

  // Métodos para acceso rápido
  completarCredenciales(usuario: UsuarioAccesoRapido) {
    this.registroForm.patchValue({
      correo: usuario.email,
      contraseña: usuario.password
    });
    
    this.usuarioSeleccionado = usuario.email;
    
    // Opcional: hacer login automáticamente después de un breve delay
    setTimeout(() => {
      this.usuarioSeleccionado = '';
    }, 2000);
  }

  // Métodos de acceso rápido individual (para mantener compatibilidad)
  completarAdmin1() {
    const admin = this.usuariosAccesoRapido.find(u => u.perfil === 'admin');
    if (admin) this.completarCredenciales(admin);
  }

  completarAdmin2() {
    // Método mantenido para compatibilidad, pero ahora usaremos los nuevos botones
    this.completarAdmin1();
  }

  completarAdmin3() {
    // Método mantenido para compatibilidad, pero ahora usaremos los nuevos botones
    this.completarAdmin1();
  }

  limpiarCampos() {
    this.registroForm.reset();
    this.successMessage = '';
    this.errorMessage = '';
    this.usuarioSeleccionado = '';
  }

  // Obtener usuarios por perfil para los desplegables
  obtenerUsuariosPorPerfil(perfil: 'admin' | 'especialista' | 'paciente'): UsuarioAccesoRapido[] {
    return this.usuariosAccesoRapido.filter(u => u.perfil === perfil);
  }

  // Obtener URL completa de la imagen desde Supabase Storage
  obtenerUrlImagen(rutaImagen: string): string {
    // Aquí construyes la URL completa del storage de Supabase
    // La URL base la puedes obtener de tu configuración de Supabase
    return `https://lzjhqkzkhkgvheqkqukn.supabase.co/storage/v1/object/public/imagenes-perfil/${rutaImagen}`;
  }
}