import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DatabaseService } from '../../services/database.service';
import { Paciente } from '../../clases/usuario';

@Component({
  selector: 'app-registro-usuarios',
  templateUrl: './registro-usuarios.component.html',
  styleUrl: './registro-usuarios.component.css',
  imports: [ReactiveFormsModule, CommonModule, RouterLink]
})
export class RegistroUsuariosComponent {
  private auth = inject(AuthService);
  private db = inject(DatabaseService);
  private fb = inject(FormBuilder);

  registroForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  
  // Para manejo de imágenes
  imagenesSeleccionadas: File[] = [];
  previewUrls: string[] = [];
  // Array para guardar los paths de las imágenes subidas (para poder eliminarlas si es necesario)
  imagenesSubidas: string[] = [];

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
      dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
      obraSocial: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  get f() {
    return this.registroForm.controls;
  }

  // Manejar selección de imágenes
  onFileSelected(event: any, index: number): void {
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

      // Si ya había una imagen subida en este índice, eliminarla del servidor
      if (this.imagenesSubidas[index]) {
        this.eliminarImagenDelServidor(this.imagenesSubidas[index]);
        this.imagenesSubidas[index] = '';
      }

      // Actualizar array de imágenes
      this.imagenesSeleccionadas[index] = file;

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrls[index] = e.target.result;
      };
      reader.readAsDataURL(file);

      this.errorMessage = '';
    }
  }

  // Remover imagen seleccionada
  async removeImage(index: number): Promise<void> {
    // Si hay una imagen subida en el servidor, eliminarla
    if (this.imagenesSubidas[index]) {
      try {
        await this.eliminarImagenDelServidor(this.imagenesSubidas[index]);
        this.imagenesSubidas[index] = '';
      } catch (error) {
        console.error('Error al eliminar imagen del servidor:', error);
      }
    }

    // Limpiar los arrays locales
    this.imagenesSeleccionadas[index] = null as any;
    this.previewUrls[index] = '';
    
    // Limpiar el input file
    const fileInput = document.getElementById(`imagen${index + 1}`) as HTMLInputElement;
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

  async subirImagenes(): Promise<{ imagen1: string, imagen2: string }> {
    const resultados = { imagen1: '', imagen2: '' };
    const correo = this.registroForm.value.correo;
    
    // Subir primera imagen
    if (this.imagenesSeleccionadas[0]) {
      const timestamp = new Date().getTime();
      const extension = this.imagenesSeleccionadas[0].name.split('.').pop();
      const filename1 = `imagen_1_${timestamp}.${extension}`;
      // Usar el correo del usuario como carpeta
      const path1 = `usuarios/${correo}/${filename1}`;
      
      try {
        resultados.imagen1 = await this.db.subirImagen(this.imagenesSeleccionadas[0], path1);
        this.imagenesSubidas[0] = path1; // Guardar el path para posibles eliminaciones
      } catch (error) {
        console.error('Error al subir primera imagen:', error);
        throw new Error('Error al subir la primera imagen');
      }
    }
    
    // Subir segunda imagen
    if (this.imagenesSeleccionadas[1]) {
      const timestamp = new Date().getTime();
      const extension = this.imagenesSeleccionadas[1].name.split('.').pop();
      const filename2 = `imagen_2_${timestamp}.${extension}`;
      // Usar el correo del usuario como carpeta
      const path2 = `usuarios/${correo}/${filename2}`;
      
      try {
        resultados.imagen2 = await this.db.subirImagen(this.imagenesSeleccionadas[1], path2);
        this.imagenesSubidas[1] = path2; // Guardar el path para posibles eliminaciones
      } catch (error) {
        console.error('Error al subir segunda imagen:', error);
        throw new Error('Error al subir la segunda imagen');
      }
    }
    
    return resultados;
  }

  async registrar() {
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

    // Validar que se hayan seleccionado 2 imágenes
    if (this.imagenesSeleccionadas.filter(img => img).length !== 2) {
      this.errorMessage = 'Debes seleccionar exactamente 2 imágenes para tu perfil.';
      return;
    }

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

      // 1. Primero crear la cuenta de autenticación
      const { correo, nombre, apellido, edad, dni, obraSocial } = this.registroForm.value;
      await this.auth.crearCuenta(correo, contraseña);

      // 2. Luego subir las imágenes
      const urlsImagenes = await this.subirImagenes();

      // 3. Crear objeto Paciente con las URLs por separado
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

      // 4. Finalmente registrar en la base de datos
      await this.db.registrarPaciente(paciente);

      this.successMessage = 'Paciente registrado exitosamente. Revisa tu correo para verificar tu cuenta.';
      this.registroForm.reset();
      this.imagenesSeleccionadas = [];
      this.previewUrls = [];
      this.imagenesSubidas = [];

      // Limpiar también los inputs de archivos
      const fileInput1 = document.getElementById('imagen1') as HTMLInputElement;
      const fileInput2 = document.getElementById('imagen2') as HTMLInputElement;
      if (fileInput1) fileInput1.value = '';
      if (fileInput2) fileInput2.value = '';

    } catch (error: any) {
      console.error('Error en el registro:', error);
      
      // Si hubo error después de subir imágenes, intentar limpiarlas
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