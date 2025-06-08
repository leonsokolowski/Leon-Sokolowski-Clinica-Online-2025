import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Usuario, Paciente, Especialista } from '../../clases/usuario';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-administracion-especialistas',
  imports: [CommonModule],
  templateUrl: './administracion-especialistas.component.html',
  styleUrl: './administracion-especialistas.component.css'
})
export class AdministracionEspecialistasComponent implements OnInit {
  
  private db = inject(DatabaseService);
  private auth = inject(AuthService);
  
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  pacientes: Paciente[] = [];
  especialistas: Especialista[] = [];
  vistaActual: 'pacientes' | 'especialistas' = 'pacientes';
  cargando = false;
  
  // Variables para el modal de confirmación
  mostrarModal = false;
  usuarioAEliminar: Usuario | null = null;
  
  // NUEVO: Variable para mostrar progreso detallado de eliminación
  procesoEliminacion = {
    mostrarProgreso: false,
    pasoActual: '',
    pasos: [
      'Obteniendo datos del usuario...',
      'Eliminando imágenes del storage...',
      'Eliminando horarios del especialista...',
      'Eliminando registro de la base de datos...',
      'Finalizando proceso...'
    ],
    pasoActualIndex: 0
  };

  async ngOnInit() {
    await this.cargarUsuarios();
  }

  async cargarUsuarios() {
    try {
      this.cargando = true;
      
      // Usar los nuevos métodos del DatabaseService
      this.pacientes = await this.db.obtenerPacientes();
      this.especialistas = await this.db.obtenerEspecialistas();
      
      // Combinar todos los usuarios
      this.usuarios = [...this.pacientes, ...this.especialistas];
      
      this.filtrarUsuarios();
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      this.mostrarError('Error al cargar usuarios');
    } finally {
      this.cargando = false;
    }
  }

  filtrarUsuarios() {
    if (this.vistaActual === 'pacientes') {
      this.usuariosFiltrados = this.pacientes;
    } else {
      this.usuariosFiltrados = this.especialistas;
    }
  }

  cambiarVista(vista: 'pacientes' | 'especialistas') {
    this.vistaActual = vista;
    this.filtrarUsuarios();
  }

  async toggleHabilitacionEspecialista(usuario: Usuario) {
    // Verificar que sea un especialista
    if (usuario.perfil !== 'especialista') {
      console.error('Solo se puede cambiar la habilitación de especialistas');
      return;
    }

    try {
      if (usuario.habilitado) {
        await this.db.deshabilitarEspecialista(usuario.email);
        usuario.habilitado = false;
      } else {
        await this.db.habilitarEspecialista(usuario.email);
        usuario.habilitado = true;
      }
      
      console.log(`Especialista ${usuario.habilitado ? 'habilitado' : 'deshabilitado'} exitosamente`);
    } catch (error) {
      console.error('Error al cambiar habilitación del especialista:', error);
      this.mostrarError('Error al cambiar habilitación del especialista');
      // Revertir el cambio visual si hay error
      await this.cargarUsuarios();
    }
  }

  abrirModalEliminar(usuario: Usuario) {
    this.usuarioAEliminar = usuario;
    this.mostrarModal = true;
    this.resetearProcesoEliminacion();
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.usuarioAEliminar = null;
    this.resetearProcesoEliminacion();
  }

  // NUEVO: Resetear estado del proceso de eliminación
  private resetearProcesoEliminacion() {
    this.procesoEliminacion.mostrarProgreso = false;
    this.procesoEliminacion.pasoActual = '';
    this.procesoEliminacion.pasoActualIndex = 0;
  }

  // MODIFICADO: Confirmar eliminación con progreso detallado
  async confirmarEliminacion() {
    if (!this.usuarioAEliminar) return;

    try {
      this.cargando = true;
      this.procesoEliminacion.mostrarProgreso = true;
      
      // Mostrar progreso paso a paso
      for (let i = 0; i < this.procesoEliminacion.pasos.length; i++) {
        this.procesoEliminacion.pasoActualIndex = i;
        this.procesoEliminacion.pasoActual = this.procesoEliminacion.pasos[i];
        
        // Dar tiempo para que se vea el cambio en la UI
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Ejecutar eliminación completa
      await this.db.eliminarUsuario(this.usuarioAEliminar.email);
      
      // Actualizar las listas locales
      this.usuarios = this.usuarios.filter(u => u.email !== this.usuarioAEliminar!.email);
      this.pacientes = this.pacientes.filter(u => u.email !== this.usuarioAEliminar!.email);
      this.especialistas = this.especialistas.filter(u => u.email !== this.usuarioAEliminar!.email);
      this.filtrarUsuarios();
      
      console.log('Usuario eliminado completamente');
      this.mostrarExito('Usuario eliminado completamente (Base de datos, imágenes y cuenta de autenticación)');
      
      // Cerrar modal después de un momento
      setTimeout(() => {
        this.cerrarModal();
      }, 1500);
      
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      this.mostrarError('Error al eliminar usuario completamente');
      this.resetearProcesoEliminacion();
    } finally {
      this.cargando = false;
    }
  }

  // NUEVO: Método para mostrar errores
  private mostrarError(mensaje: string) {
    // Aquí puedes implementar un toast o alert
    alert(`Error: ${mensaje}`);
  }

  // NUEVO: Método para mostrar éxito
  private mostrarExito(mensaje: string) {
    // Aquí puedes implementar un toast o alert
    console.log(`Éxito: ${mensaje}`);
  }

  // Métodos auxiliares para el template
  getPacienteObraSocial(usuario: Usuario): string {
    if (usuario.perfil === 'paciente') {
      const paciente = usuario as Paciente;
      return paciente.obra_social || 'No especificada';
    }
    return 'N/A';
  }

  getEspecialistaEspecialidades(usuario: Usuario): string[] {
    if (usuario.perfil === 'especialista') {
      const especialista = usuario as Especialista;
      return especialista.especialidades || [];
    }
    return [];
  }

  // Método para manejar errores de carga de imagen
  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/default-avatar.png';
  }
}