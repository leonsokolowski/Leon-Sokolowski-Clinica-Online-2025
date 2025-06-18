import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DatabaseService } from '../../services/database.service';
import { CaptchaService } from '../../services/captcha.service';
import { Paciente } from '../../clases/usuario';
import { Router } from '@angular/router';
// Importar el módulo de ngx-captcha
import { NgxCaptchaModule } from 'ngx-captcha';

@Component({
  selector: 'app-registro-usuarios',
  templateUrl: './registro-usuarios.component.html',
  styleUrl: './registro-usuarios.component.css',
  imports: [ReactiveFormsModule, CommonModule, RouterLink, NgxCaptchaModule]
})
export class RegistroUsuariosComponent {
  private auth = inject(AuthService);
  private db = inject(DatabaseService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private captchaService = inject(CaptchaService);

  registroForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  
  // Para manejo de imágenes
  imagenesSeleccionadas: File[] = [];
  previewUrls: string[] = [];
  imagenesSubidas: string[] = [];

  // CAPTCHA configuration
  siteKey: string = '6Ld4qmQrAAAAAJCEFHW4W_X0tZm1IGtNRjUHV7_C'; 
  captchaToken: string = '';
  captchaError: string = '';

  constructor() {
    this.registroForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      contraseña: ['', [
        Validators.required, 
        Validators.minLength(6), 
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/)
      ]],
      confirmarContraseña: ['', [Validators.required]],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(1)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
      obraSocial: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  get f() {
    return this.registroForm.controls;
  }

  // Métodos del CAPTCHA
  onCaptchaSuccess(token: string): void {
    this.captchaToken = token;
    this.captchaError = '';
    this.captchaService.storeCaptchaToken(token);
    console.log('CAPTCHA completado exitosamente');
  }

  onCaptchaError(): void {
    this.captchaToken = '';
    this.captchaError = 'Error al cargar el captcha. Por favor, recarga la página.';
    this.captchaService.clearCaptchaToken();
    console.error('Error en el captcha');
  }

  onCaptchaExpired(): void {
    this.captchaToken = '';
    this.captchaError = 'El captcha ha expirado. Por favor, complétalos nuevamente.';
    this.captchaService.clearCaptchaToken();
    console.warn('CAPTCHA expirado');
  }

  onCaptchaLoaded(): void {
    console.log('CAPTCHA cargado correctamente');
  }

  // Método para resetear captcha manualmente
  resetCaptcha(): void {
    this.captchaService.resetCaptcha();
    this.captchaToken = '';
    this.captchaError = '';
  }

  // Manejar selección de imágenes
  onFileSelected(event: any, index: number): void {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Por favor selecciona solo archivos de imagen.';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'La imagen no debe superar los 5MB.';
        return;
      }

      if (this.imagenesSubidas[index]) {
        this.eliminarImagenDelServidor(this.imagenesSubidas[index]);
        this.imagenesSubidas[index] = '';
      }

      this.imagenesSeleccionadas[index] = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrls[index] = e.target.result;
      };
      reader.readAsDataURL(file);

      this.errorMessage = '';
    }
  }

  async removeImage(index: number): Promise<void> {
    if (this.imagenesSubidas[index]) {
      try {
        await this.eliminarImagenDelServidor(this.imagenesSubidas[index]);
        this.imagenesSubidas[index] = '';
      } catch (error) {
        console.error('Error al eliminar imagen del servidor:', error);
      }
    }

    this.imagenesSeleccionadas[index] = null as any;
    this.previewUrls[index] = '';
    
    const fileInput = document.getElementById(`imagen${index + 1}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

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

  async subirImagenes(): Promise<{ imagen1: string, imagen2: string }> {
    const resultados = { imagen1: '', imagen2: '' };
    const correo = this.registroForm.value.correo;
    
    if (this.imagenesSeleccionadas[0]) {
      const timestamp = new Date().getTime();
      const extension = this.imagenesSeleccionadas[0].name.split('.').pop();
      const filename1 = `imagen_1_${timestamp}.${extension}`;
      const path1 = `usuarios/${correo}/${filename1}`;
      
      try {
        resultados.imagen1 = await this.db.subirImagen(this.imagenesSeleccionadas[0], path1);
        this.imagenesSubidas[0] = path1;
      } catch (error) {
        console.error('Error al subir primera imagen:', error);
        throw new Error('Error al subir la primera imagen');
      }
    }
    
    if (this.imagenesSeleccionadas[1]) {
      const timestamp = new Date().getTime();
      const extension = this.imagenesSeleccionadas[1].name.split('.').pop();
      const filename2 = `imagen_2_${timestamp}.${extension}`;
      const path2 = `usuarios/${correo}/${filename2}`;
      
      try {
        resultados.imagen2 = await this.db.subirImagen(this.imagenesSeleccionadas[1], path2);
        this.imagenesSubidas[1] = path2;
      } catch (error) {
        console.error('Error al subir segunda imagen:', error);
        throw new Error('Error al subir la segunda imagen');
      }
    }
    
    return resultados;
  }

  async registrar() {
    // Limpiar mensajes previos
    this.errorMessage = '';
    this.successMessage = '';
    this.captchaError = '';

    // Validar formulario
    if (this.registroForm.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    // Validar contraseñas
    const { contraseña, confirmarContraseña } = this.registroForm.value;
    if (contraseña !== confirmarContraseña) {
      this.registroForm.controls['confirmarContraseña'].setErrors({ noMatch: true });
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    // Validar imágenes
    if (this.imagenesSeleccionadas.filter(img => img).length !== 2) {
      this.errorMessage = 'Debes seleccionar exactamente 2 imágenes para tu perfil.';
      return;
    }

    // *** VALIDAR CAPTCHA - ESTO ES LO NUEVO ***
    const captchaValidation = this.captchaService.validateCaptchaForSubmit();
    if (!captchaValidation.isValid) {
      this.captchaError = captchaValidation.message;
      this.errorMessage = captchaValidation.message;
      return;
    }

    this.isLoading = true;

    try {
      // Verificar usuario existente
      const usuarioExistente = await this.verificarUsuarioExistente();
      if (usuarioExistente) {
        this.errorMessage = 'Ya existe un usuario con ese correo, DNI o combinación de nombre y apellido.';
        this.isLoading = false;
        return;
      }

      // Crear cuenta
      const { correo, nombre, apellido, edad, dni, obraSocial } = this.registroForm.value;
      await this.auth.crearCuenta(correo, contraseña);

      // Subir imágenes
      const urlsImagenes = await this.subirImagenes();

      // Crear paciente
      const paciente = new Paciente(
        nombre,
        apellido,
        edad,
        dni,
        correo,
        obraSocial,
        urlsImagenes.imagen1,
        urlsImagenes.imagen2
      );

      // Registrar en BD
      await this.db.registrarPaciente(paciente);

      // Cerrar sesión
      await this.auth.cerrarSesionParaRegistro();

      // Limpiar captcha después del registro exitoso
      this.captchaService.clearCaptchaToken();

      this.successMessage = 'Paciente registrado exitosamente. Ahora puedes iniciar sesión.';
      this.registroForm.reset();
      this.imagenesSeleccionadas = [];
      this.previewUrls = [];
      this.imagenesSubidas = [];
      this.captchaToken = '';

      // Limpiar inputs de archivos
      const fileInput1 = document.getElementById('imagen1') as HTMLInputElement;
      const fileInput2 = document.getElementById('imagen2') as HTMLInputElement;
      if (fileInput1) fileInput1.value = '';
      if (fileInput2) fileInput2.value = '';

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);

    } catch (error: any) {
      console.error('Error en el registro:', error);
      
      // Limpiar imágenes en caso de error
      if (this.imagenesSubidas.length > 0) {
        this.imagenesSubidas.forEach(async (path, index) => {
          if (path) {
            try {
              await this.eliminarImagenDelServidor(path);
            } catch (cleanupError) {
              console.error(`Error al limpiar imagen ${index + 1}:`, cleanupError);
            }
          }
        });
      }
      
      // Resetear captcha en caso de error
      this.resetCaptcha();
      
      // Manejo de errores específicos
      if (error.message?.includes('User already registered')) {
        this.errorMessage = 'Ya existe una cuenta con este correo electrónico.';
      } else if (error.message?.includes('Invalid email')) {
        this.errorMessage = 'El formato del correo electrónico no es válido.';
      } else if (error.message?.includes('Password')) {
        this.errorMessage = 'La contraseña no cumple con los requisitos mínimos.';
      } else {
        this.errorMessage = error.message || 'Hubo un error al registrar la cuenta. Por favor, intenta nuevamente.';
      }
      
    } finally {
      this.isLoading = false;
    }
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.registroForm.controls).forEach(key => {
      this.registroForm.get(key)?.markAsTouched();
    });
  }

  confirmarContraseñaValidator = (control: any) => {
    if (!control.value) return null;
    
    const contraseña = this.registroForm?.get('contraseña')?.value;
    return control.value === contraseña ? null : { noMatch: true };
  };
}