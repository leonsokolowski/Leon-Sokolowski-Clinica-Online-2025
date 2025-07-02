import { Component, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Paciente } from '../../clases/usuario';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { DniFormatoPipe } from '../../pipes/dni-formato.pipe';
import { MensajePDFDirective } from '../../directives/mensaje-pdf.directive';

@Component({
  selector: 'app-historia-clinica',
  standalone: true,
  imports: [CommonModule, DniFormatoPipe, MensajePDFDirective],
  templateUrl: './historia-clinica.component.html',
  styleUrl: './historia-clinica.component.css'
})
export class HistoriaClinicaComponent implements OnInit {
  @ViewChild('pdfContent', { static: false }) pdfContent!: ElementRef;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private db = inject(DatabaseService);
  private auth = inject(AuthService);

  paciente: Paciente | null = null;
  turnos: any[] = [];
  loading = true;
  error = '';
  esVistaAnidada = false;
  generandoPDF = false;

  async ngOnInit() {
    this.detectarContexto();
    
    try {
      await this.cargarDatos();
    } catch (error) {
      console.error('Error al cargar historia clínica:', error);
      this.error = 'Error al cargar la historia clínica';
    } finally {
      this.loading = false;
    }
  }

  private detectarContexto() {
    const url = this.router.url;
    this.esVistaAnidada = url.includes('mi-perfil/historia-clinica');
  }

  private async cargarDatos() {
    const pacienteIdParam = this.route.snapshot.paramMap.get('pacienteId');
    
    let pacienteId: number;
    
    if (pacienteIdParam) {
      pacienteId = parseInt(pacienteIdParam);
    } else {
      const usuarioActual = await this.auth.obtenerUsuarioActual();
      if (!usuarioActual || usuarioActual.perfil !== 'paciente') {
        throw new Error('No se pudo identificar al paciente');
      }
      pacienteId = usuarioActual.id!;
    }

    await this.cargarPaciente(pacienteId);
    await this.cargarTurnos(pacienteId);
  }

  private async cargarPaciente(pacienteId: number) {
    const pacientes = await this.db.obtenerPacientes();
    this.paciente = pacientes.find(p => p.id === pacienteId) || null;
    
    if (!this.paciente) {
      throw new Error('Paciente no encontrado');
    }
  }

  private async cargarTurnos(pacienteId: number) {
    this.turnos = await this.db.obtenerTurnosConDetalles('paciente', pacienteId);
    this.turnos = this.turnos.filter(turno => turno.estado === 'finalizado');
  }

  async descargarPDF() {
    if (!this.paciente || this.generandoPDF) return;

    this.generandoPDF = true;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let currentY = 20;

      // Header con logo y título
      await this.agregarHeader(pdf, pageWidth, currentY);
      currentY += 50;

      // Información del paciente
      currentY = await this.agregarInfoPaciente(pdf, pageWidth, currentY);
      currentY += 20;

      // Turnos - si hay muchos, dividir en páginas
      if (this.turnos.length > 0) {
        for (let i = 0; i < this.turnos.length; i++) {
          const turno = this.turnos[i];
          
          // Verificar si necesitamos nueva página
          if (currentY > pageHeight - 80) {
            pdf.addPage();
            currentY = 20;
          }

          currentY = await this.agregarTurno(pdf, turno, pageWidth, currentY);
          currentY += 15;
        }
      } else {
        pdf.setFontSize(12);
        pdf.setTextColor(128, 128, 128);
        pdf.text('No se encontraron atenciones registradas.', 20, currentY);
      }

      // Descargar el PDF
      const nombreArchivo = `Historia_Clinica_${this.paciente.nombre}_${this.paciente.apellido}_${this.obtenerFechaActual()}.pdf`;
      pdf.save(nombreArchivo);

    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF. Intente nuevamente.');
    } finally {
      this.generandoPDF = false;
    }
  }

  private async agregarHeader(pdf: jsPDF, pageWidth: number, startY: number) {
    try {
      // Cargar y agregar el logo de la clínica
      const logoPath = 'favicon.png';
      const img = new Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = logoPath;
      });

      // Agregar logo al PDF (ajustado para que se vea bien)
      pdf.addImage(img, 'PNG', 20, startY, 15, 15);
      
      // Texto de la clínica al lado del logo
      pdf.setTextColor(41, 128, 185);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CLÍNICA ONLINE', 38, startY + 8);
      
    } catch (error) {
      console.warn('No se pudo cargar el logo, usando texto alternativo', error);
      // Fallback si no se puede cargar el logo
      pdf.setFillColor(41, 128, 185);
      pdf.rect(20, startY, 12, 12, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text('CLÍNICA', 26, startY + 8, { align: 'center' });
    }

    // Título principal
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HISTORIA CLÍNICA', pageWidth / 2, startY + 8, { align: 'center' });

    // Fecha de emisión
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const fechaEmision = `Fecha de emisión: ${this.obtenerFechaActual()}`;
    pdf.text(fechaEmision, pageWidth - 20, startY + 18, { align: 'right' });

    // Línea separadora
    pdf.setDrawColor(41, 128, 185);
    pdf.setLineWidth(0.5);
    pdf.line(20, startY + 25, pageWidth - 20, startY + 25);
  }

  private async agregarInfoPaciente(pdf: jsPDF, pageWidth: number, startY: number): Promise<number> {
    if (!this.paciente) return startY;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('INFORMACIÓN DEL PACIENTE', 20, startY);

    let currentY = startY + 10;

    // Datos del paciente
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    pdf.text(`Nombre: ${this.paciente.nombre} ${this.paciente.apellido}`, 20, currentY);
    pdf.text(`DNI: ${this.paciente.dni}`, 20, currentY + 7);
    pdf.text(`Edad: ${this.paciente.edad} años`, 20, currentY + 14);
    pdf.text(`Obra Social: ${this.paciente.obra_social}`, 20, currentY + 21);

    return currentY + 30;
  }

  private async agregarTurno(pdf: jsPDF, turno: any, pageWidth: number, startY: number): Promise<number> {
    let currentY = startY;

    // Header del turno
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, currentY, pageWidth - 40, 8, 'F');
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${this.formatearFecha(turno.fecha)} - ${this.formatearHora(turno.hora)}`, 22, currentY + 5);
    pdf.text(`${turno.especialidad}`, pageWidth - 22, currentY + 5, { align: 'right' });

    currentY += 12;

    // Especialista
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Dr. ${turno.especialista.nombre} ${turno.especialista.apellido}`, 22, currentY);
    currentY += 8;

    // Diagnóstico
    if (turno.diagnostico) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Diagnóstico:', 22, currentY);
      pdf.setFont('helvetica', 'normal');
      const diagnosticoLines = pdf.splitTextToSize(turno.diagnostico, pageWidth - 50);
      pdf.text(diagnosticoLines, 22, currentY + 5);
      currentY += 5 + (diagnosticoLines.length * 5);
    }

    // Observaciones
    if (turno.comentario_especialista) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Observaciones:', 22, currentY);
      pdf.setFont('helvetica', 'normal');
      const observacionesLines = pdf.splitTextToSize(turno.comentario_especialista, pageWidth - 50);
      pdf.text(observacionesLines, 22, currentY + 5);
      currentY += 5 + (observacionesLines.length * 5);
    }

    // Datos vitales
    const datosVitales = [];
    if (turno.altura_cm) datosVitales.push(`Altura: ${turno.altura_cm} cm`);
    if (turno.peso_kg) datosVitales.push(`Peso: ${turno.peso_kg} kg`);
    if (turno.temperatura_c) datosVitales.push(`Temperatura: ${turno.temperatura_c}°C`);
    if (turno.presion_arterial) datosVitales.push(`Presión: ${turno.presion_arterial}`);

    if (datosVitales.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Datos Vitales:', 22, currentY);
      pdf.setFont('helvetica', 'normal');
      currentY += 5;
      datosVitales.forEach(dato => {
        pdf.text(`• ${dato}`, 24, currentY);
        currentY += 5;
      });
    }

    // Datos dinámicos
    const datosDinamicos = this.obtenerDatosDinamicos(turno);
    if (datosDinamicos.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Datos Adicionales:', 22, currentY);
      pdf.setFont('helvetica', 'normal');
      currentY += 5;
      datosDinamicos.forEach(dato => {
        pdf.text(`• ${dato.clave}: ${dato.valor}`, 24, currentY);
        currentY += 5;
      });
    }

    // Calificación
    if (turno.puntaje) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Calificación: ${turno.puntaje}/5`, 22, currentY);
      currentY += 7;
    }

    return currentY;
  }

  private obtenerFechaActual(): string {
    const fecha = new Date();
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  volver() {
    if (this.esVistaAnidada) {
      this.router.navigate(['../'], { relativeTo: this.route });
    } else {
      this.router.navigate(['/usuarios']);
    }
  }

  formatearFecha(fecha: string): string {
    const partes = fecha.split('-');
    if (partes.length === 3) {
      const año = parseInt(partes[0]);
      const mes = parseInt(partes[1]) - 1;
      const dia = parseInt(partes[2]);
      const fechaObj = new Date(año, mes, dia);
      return fechaObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatearHora(hora: string): string {
    return hora.substring(0, 5);
  }

  obtenerDatosDinamicos(turno: any): { clave: string; valor: string }[] {
    if (!turno.datos_dinamicos) return [];
    
    return Object.entries(turno.datos_dinamicos).map(([clave, valor]) => ({
      clave,
      valor: valor as string
    }));
  }
}