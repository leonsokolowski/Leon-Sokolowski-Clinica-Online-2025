import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DatabaseService } from '../../services/database.service';
import { CaptchaService } from '../../services/captcha.service';
import { Especialista } from '../../clases/usuario';
// Importar el módulo de ngx-captcha
import { NgxCaptchaModule } from 'ngx-captcha';

@Component({
  selector: 'app-registro-especialistas',
  templateUrl: './registro-especialistas.component.html',
  styleUrl: './registro-especialistas.component.css',
  imports: [ReactiveFormsModule, CommonModule, FormsModule, RouterLink, NgxCaptchaModule]
})
export class RegistroEspecialistasComponent {
  private auth = inject(AuthService);
  private db = inject(DatabaseService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private captchaService = inject(CaptchaService);

  registroForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  
  // Para manejo de imagen
  imagenSeleccionada: File | null = null;
  previewUrl: string = '';
  imagenSubida: string = '';

  // Para manejo de especialidades
  especialidadesPredefinidas: string[] = [
    'Cardiología',
    'Dermatología',
    'Endocrinología',
    'Gastroenterología',
    'Ginecología',
    'Neurología',
    'Oftalmología',
    'Oncología',
    'Ortopedia',
    'Otorrinolaringología',
    'Pediatría',
    'Psiquiatría',
    'Traumatología',
    'Urología'
  ];

  especialidadesSeleccionadas: string[] = [];
  especialidadesAgregadas: string[] = []; // Nueva propiedad para especialidades personalizadas
  nuevaEspecialidad: string = '';
  mostrarErrorEspecialidades: boolean = false;
  mostrarErrorImagen: boolean = false;

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

  // Manejar cambios en checkboxes de especialidades
  onEspecialidadChange(event: any): void {
    const especialidad = event.target.value;
    const isChecked = event.target.checked;

    if (isChecked) {
      if (!this.especialidadesSeleccionadas.includes(especialidad)) {
        this.especialidadesSeleccionadas.push(especialidad);
      }
    } else {
      this.especialidadesSeleccionadas = this.especialidadesSeleccionadas.filter(
        esp => esp !== especialidad
      );
    }

    this.mostrarErrorEspecialidades = false;
  }

  // Agregar especialidad personalizada
  agregarEspecialidadPersonalizada(): void {
    const especialidadTrimmed = this.nuevaEspecialidad.trim();
    
    if (especialidadTrimmed && 
        !this.especialidadesSeleccionadas.includes(especialidadTrimmed) &&
        !this.especialidadesAgregadas.includes(especialidadTrimmed)) {
      this.especialidadesAgregadas.push(especialidadTrimmed);
      this.especialidadesSeleccionadas.push(especialidadTrimmed);
      this.nuevaEspecialidad = '';
      this.mostrarErrorEspecialidades = false;
    }
  }

  // Remover especialidad agregada personalmente
  removerEspecialidadAgregada(especialidad: string): void {
    this.especialidadesAgregadas = this.especialidadesAgregadas.filter(
      esp => esp !== especialidad
    );
    
    this.especialidadesSeleccionadas = this.especialidadesSeleccionadas.filter(
      esp => esp !== especialidad
    );
  }

  // Remover especialidad seleccionada (mantener para compatibilidad, pero ya no se usa en el HTML)
  removerEspecialidad(especialidad: string): void {
    this.especialidadesSeleccionadas = this.especialidadesSeleccionadas.filter(
      esp => esp !== especialidad
    );

    // Desmarcar checkbox si es una especialidad predefinida
    const checkbox = document.getElementById('esp-' + especialidad) as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = false;
    }
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
    const path = `especialistas/${correo}/${filename}`;
    
    try {
      const url = await this.db.subirImagen(this.imagenSeleccionada, path);
      this.imagenSubida = path; // Guardar el path para posibles eliminaciones
      return url;
    } catch (error) {
      console.error('Error al subir imagen:', error);
      throw new Error('Error al subir la imagen de perfil');
    }
  }

  async registrar() {
    // Limpiar mensajes previos
    this.errorMessage = '';
    this.successMessage = '';
    this.captchaError = '';

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

    // Validar que se haya seleccionado al menos una especialidad
    if (this.especialidadesSeleccionadas.length === 0) {
      this.mostrarErrorEspecialidades = true;
      this.errorMessage = 'Debes seleccionar al menos una especialidad.';
      return;
    }

    // Validar que se haya seleccionado una imagen
    if (!this.imagenSeleccionada) {
      this.mostrarErrorImagen = true;
      this.errorMessage = 'Debes seleccionar una imagen de perfil.';
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
      // Verificar si el usuario ya existe
      const usuarioExistente = await this.verificarUsuarioExistente();
      if (usuarioExistente) {
        this.errorMessage = 'Ya existe un usuario con ese correo, DNI o combinación de nombre y apellido.';
        this.isLoading = false;
        return;
      }

      // 1. Crear la cuenta de autenticación sin redirecciones
      const { correo, nombre, apellido, edad, dni } = this.registroForm.value;
      await this.auth.crearCuentaParaRegistro(correo, contraseña);

      // 2. Subir la imagen
      const urlImagen = await this.subirImagen();

      // 3. Crear objeto Especialista
      const especialista = new Especialista(
        nombre,
        apellido,
        edad,
        dni,
        correo,
        this.especialidadesSeleccionadas,
        urlImagen
      );

      // 4. Registrar en la base de datos
      await this.db.registrarEspecialista(especialista);

      // 5. Cerrar la sesión creada automáticamente
      await this.auth.cerrarSesionParaRegistro();

      // Limpiar captcha después del registro exitoso
      this.captchaService.clearCaptchaToken();

      this.successMessage = 'Especialista registrado exitosamente. El administrador debe habilitarlo antes de que pueda acceder al sistema.';
      this.registroForm.reset();
      this.especialidadesSeleccionadas = [];
      this.especialidadesAgregadas = [];
      this.imagenSeleccionada = null;
      this.previewUrl = '';
      this.imagenSubida = '';
      this.captchaToken = '';

      // Limpiar el input de archivo
      const fileInput = document.getElementById('imagen1') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Desmarcar todos los checkboxes
      this.especialidadesPredefinidas.forEach(esp => {
        const checkbox = document.getElementById('esp-' + esp) as HTMLInputElement;
        if (checkbox) {
          checkbox.checked = false;
        }
      });

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
      
      // Resetear captcha en caso de error
      this.resetCaptcha();
      
      // Mejorar el manejo de errores específicos
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

  // Validador personalizado para confirmar contraseña
  confirmarContraseñaValidator = (control: any) => {
    if (!control.value) return null;
    
    const contraseña = this.registroForm?.get('contraseña')?.value;
    return control.value === contraseña ? null : { noMatch: true };
  };
}