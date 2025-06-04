import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DatabaseService } from '../../services/database.service';
import { Admin } from '../../clases/usuario';

@Component({
  selector: 'app-registro-admins',
  templateUrl: './registro-admins.component.html',
  styleUrl: './registro-admins.component.css',
  imports: [ReactiveFormsModule, CommonModule]
})
export class RegistroAdminsComponent {
  private auth = inject(AuthService);
  private db = inject(DatabaseService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  registroForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  
  // Para manejo de imagen
  imagenSeleccionada: File | null = null;
  previewUrl: string = '';
  imagenSubida: string = '';
  mostrarErrorImagen: boolean = false;

  // Para el modal de confirmación
  mostrarModal: boolean = false;

  constructor() {
    this.registroForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contraseña: ['', [
        Validators.required, 
        Validators.minLength(6), 
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/) // Al menos una mayúscula y un número
      ]],
      confirmarContraseña: ['', [Validators.required]],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(18)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]]
    });
  }

  get f() {
    return this.registroForm.controls;
  }

  // Manejar selección de imagen
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Por favor selecciona solo archivos de imagen.';
        return;
      }

      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'La imagen no debe superar los 5MB.';
        return;
      }

      // Si ya había una imagen subida, eliminarla del servidor
      if (this.imagenSubida) {
        this.eliminarImagenDelServidor(this.imagenSubida);
        this.imagenSubida = '';
      }

      // Actualizar imagen seleccionada
      this.imagenSeleccionada = file;

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);

      this.errorMessage = '';
      this.mostrarErrorImagen = false;
    }
  }

  // Remover imagen seleccionada
  async removeImage(): Promise<void> {
    // Si hay una imagen subida en el servidor, eliminarla
    if (this.imagenSubida) {
      try {
        await this.eliminarImagenDelServidor(this.imagenSubida);
        this.imagenSubida = '';
      } catch (error) {
        console.error('Error al eliminar imagen del servidor:', error);
      }
    }

    // Limpiar los datos locales
    this.imagenSeleccionada = null;
    this.previewUrl = '';
    
    // Limpiar el input file
    const fileInput = document.getElementById('imagen1') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Método para eliminar imagen del servidor
  private async eliminarImagenDelServidor(path: string): Promise<void> {
    try {
      await this.db.eliminarImagen(path);
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
      throw error;
    }
  }

  async verificarUsuarioExistente(): Promise<boolean> {
    const { correo, dni, nombre, apellido } = this.registroForm.value;
    try {
      return await this.db.verificarUsuarioExistente(correo, dni, nombre, apellido);
    } catch (error) {
      console.error('Error al verificar usuario:', error);
      throw error;
    }
  }

  async subirImagen(): Promise<string> {
    if (!this.imagenSeleccionada) {
      throw new Error('No hay imagen seleccionada');
    }

    const correo = this.registroForm.value.correo;
    const timestamp = new Date().getTime();
    const extension = this.imagenSeleccionada.name.split('.').pop();
    const filename = `imagen_perfil_${timestamp}.${extension}`;
    const path = `admins/${correo}/${filename}`;
    
    try {
      const url = await this.db.subirImagen(this.imagenSeleccionada, path);
      this.imagenSubida = path; // Guardar el path para posibles eliminaciones
      return url;
    } catch (error) {
      console.error('Error al subir imagen:', error);
      throw new Error('Error al subir la imagen de perfil');
    }
  }

  // Método para mostrar el modal de confirmación
  confirmarRegistro(): void {
    // Validar formulario básico
    if (this.registroForm.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    // Validar que las contraseñas coincidan
    const { contraseña, confirmarContraseña } = this.registroForm.value;
    if (contraseña !== confirmarContraseña) {
      this.registroForm.controls['confirmarContraseña'].setErrors({ noMatch: true });
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    // Validar que se haya seleccionado una imagen
    if (!this.imagenSeleccionada) {
      this.mostrarErrorImagen = true;
      this.errorMessage = 'Debes seleccionar una imagen de perfil.';
      return;
    }

    // Mostrar modal de confirmación
    this.mostrarModal = true;
    this.errorMessage = '';
  }

  // Cancelar el registro
  cancelarRegistro(): void {
    this.mostrarModal = false;
  }

  // Proceder con el registro después de la confirmación
  async procederConRegistro(): Promise<void> {
    this.mostrarModal = false;
    await this.registrar();
  }

  async registrar(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Verificar si el usuario ya existe
      const usuarioExistente = await this.verificarUsuarioExistente();
      if (usuarioExistente) {
        this.errorMessage = 'Ya existe un usuario con ese correo, DNI o combinación de nombre y apellido.';
        this.isLoading = false;
        return;
      }

      // 1. Primero crear la cuenta de autenticación (sin redirecciones automáticas)
      const { correo, contraseña, nombre, apellido, edad, dni } = this.registroForm.value;
      await this.auth.crearCuentaParaRegistro(correo, contraseña);

      // 2. Luego subir la imagen
      const urlImagen = await this.subirImagen();

      // 3. Crear objeto Admin
      const admin = new Admin(
        nombre,
        apellido,
        parseInt(edad), // Asegurar que sea número
        dni,
        correo,
        urlImagen
      );

      // 4. Registrar en la base de datos
      await this.db.registrarAdmin(admin);

      // 5. Cerrar sesión inmediatamente después del registro exitoso
      await this.auth.cerrarSesionParaRegistro();

      this.successMessage = 'Administrador registrado exitosamente. La sesión se ha cerrado.';
      this.limpiarFormulario();

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);

    } catch (error: any) {
      console.error('Error en el registro:', error);
      
      // Si hubo error después de subir imagen, intentar limpiarla
      if (this.imagenSubida) {
        try {
          await this.eliminarImagenDelServidor(this.imagenSubida);
        } catch (cleanupError) {
          console.error('Error al limpiar imagen:', cleanupError);
        }
      }
      
      // Asegurar que la sesión esté cerrada incluso si hay error
      try {
        await this.auth.cerrarSesionParaRegistro();
      } catch (logoutError) {
        console.error('Error al cerrar sesión después de error:', logoutError);
      }
      
      // Mejorar el manejo de errores específicos
      if (error.code === '23505') { // Constraint violation en PostgreSQL
        this.errorMessage = 'Ya existe un usuario con ese correo o DNI.';
      } else if (error.message?.includes('User already registered')) {
        this.errorMessage = 'Ya existe una cuenta con este correo electrónico.';
      } else if (error.message?.includes('Invalid email')) {
        this.errorMessage = 'El formato del correo electrónico no es válido.';
      } else if (error.message?.includes('Password')) {
        this.errorMessage = 'La contraseña no cumple con los requisitos mínimos.';
      } else {
        this.errorMessage = error.message || 'Hubo un error al registrar el administrador. Por favor, intenta nuevamente.';
      }
      
    } finally {
      this.isLoading = false;
    }
  }

  private limpiarFormulario(): void {
    this.registroForm.reset();
    this.imagenSeleccionada = null;
    this.previewUrl = '';
    this.imagenSubida = '';
    this.mostrarErrorImagen = false;

    // Limpiar también el input de archivo
    const fileInput = document.getElementById('imagen1') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.registroForm.controls).forEach(key => {
      this.registroForm.get(key)?.markAsTouched();
    });
  }

  // Validador personalizado para confirmar contraseña
  confirmarContraseñaValidator = (control: any) => {
    if (!control.value) return null;
    
    const contraseña = this.registroForm?.get('contraseña')?.value;
    return control.value === contraseña ? null : { noMatch: true };
  };
}