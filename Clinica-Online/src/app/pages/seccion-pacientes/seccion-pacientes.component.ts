import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { Paciente } from '../../clases/usuario';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { DniFormatoPipe } from '../../pipes/dni-formato.pipe';

@Component({
  selector: 'app-seccion-pacientes',
  standalone: true,
  imports: [CommonModule, DniFormatoPipe],
  templateUrl: './seccion-pacientes.component.html',
  styleUrl: './seccion-pacientes.component.css'
})
export class SeccionPacientesComponent implements OnInit {
  private db = inject(DatabaseService);
  private auth = inject(AuthService);
  private router = inject(Router);

  pacientesAtendidos: Paciente[] = [];
  loading = true;
  error = '';
  especialistaId: number | null = null;

  async ngOnInit() {
    try {
      await this.cargarPacientesAtendidos();
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
      this.error = 'Error al cargar la lista de pacientes';
    } finally {
      this.loading = false;
    }
  }

  private async cargarPacientesAtendidos() {
    // Obtener el especialista actual
    const usuarioActual = await this.auth.obtenerUsuarioActual();
    console.log('Usuario actual:', usuarioActual);
    
    if (!usuarioActual || usuarioActual.perfil !== 'especialista') {
      throw new Error('Usuario no autorizado');
    }
    
    this.especialistaId = usuarioActual?.id!;
    console.log('Especialista ID:', this.especialistaId);

    // Verificar que tenemos un ID válido antes de continuar
    if (!this.especialistaId) {
      throw new Error('No se pudo obtener el ID del especialista');
    }

    // Obtener todos los turnos del especialista
    const turnosEspecialista = await this.db.obtenerTurnosConDetalles('especialista', this.especialistaId);
    console.log('Turnos del especialista:', turnosEspecialista);
    
    // Filtrar solo los turnos finalizados
    const turnosFinalizados = turnosEspecialista.filter(turno => turno.estado === 'finalizado');
    console.log('Turnos finalizados:', turnosFinalizados);
    
    // Obtener IDs únicos de pacientes que fueron atendidos
    // CORRECCIÓN: Usar paciente_id en lugar de paciente.id
    const pacientesIds = [...new Set(turnosFinalizados.map(turno => turno.paciente_id))];
    console.log('IDs de pacientes atendidos:', pacientesIds);
    
    // Filtrar solo IDs válidos (no undefined)
    const pacientesIdsLimpios = pacientesIds.filter(id => id !== undefined);
    console.log('IDs de pacientes atendidos (limpios):', pacientesIdsLimpios);
    
    // Cargar la información completa de los pacientes
    const todosPacientes = await this.db.obtenerPacientes();
    console.log('Todos los pacientes:', todosPacientes);
    
    this.pacientesAtendidos = todosPacientes.filter(paciente => 
      pacientesIdsLimpios.includes(paciente.id!)
    );
    console.log('Pacientes atendidos filtrados:', this.pacientesAtendidos);

    // Ordenar por apellido
    this.pacientesAtendidos.sort((a, b) => a.apellido.localeCompare(b.apellido));
  }

  verHistoriaClinica(paciente: Paciente) {
    this.router.navigate(['/historia-clinica', paciente.id]);
  }

  async contarAtencionesPaciente(pacienteId: number): Promise<number> {
    if (!this.especialistaId) return 0;
    
    const turnos = await this.db.obtenerTurnosConDetalles('especialista', this.especialistaId);
    return turnos.filter(turno => 
      turno.paciente_id === pacienteId && turno.estado === 'finalizado'
    ).length;
  }
}