import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import { DatabaseService } from '../../services/database.service';
import { FormsModule } from '@angular/forms';
import { MensajePDFDirective } from '../../directives/mensaje-pdf.directive';

interface Turno {
  id: number;
  fecha: string;
  estado: string;
  especialidad: string;
  especialista_id: string;
  created_at : string;
}

interface LogIngreso {
  id: number;
  usuario_id: number;
  email: string;
  fecha_ingreso: string;
  timestamp: string;
  usuario: {
    nombre: string;
    apellido: string;
    email: string;
    perfil: string;
  };
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule, MensajePDFDirective],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.css'
})
export class EstadisticasComponent implements OnInit {
  db = inject(DatabaseService)
  logs = signal<LogIngreso[]>([]);
  turnosPorEspecialidad = signal<Record<string, number>>({});
  turnosPorDia = signal<Record<string, number>>({});
  turnosPorMedico = signal<Record<string, number>>({});
  turnosFinalizados = signal<Record<string, number>>({});
  logsIngresoPorDia = signal<Record<string, number>>({});

  filtroDesde: string = '2025-01-01';
  filtroHasta: string = '2025-12-31'; 

  ngOnInit(): void {
    this.cargarDatos();
  } 

  async cargarDatos() {
  try {
    // Pedimos los turnos y logs en paralelo
    const [turnosResp, logsResp] = await Promise.all([
      this.db.getTodosLosTurnos(),
      this.db.getLogsIngresoConUsuarios()
    ]);

    // Tipamos correctamente el resultado
    const turnos: Turno[] = turnosResp.data || [];
    const logs: LogIngreso[] = logsResp || [];
    
    console.log('Logs recibidos:', logs); // Debug
    this.logs.set(logs);

    // Agrupamos por especialidad y por día (SIN filtro de fecha)
    this.turnosPorEspecialidad.set(this.agrupar(turnos, 'especialidad'));
    this.turnosPorDia.set(this.agrupar(turnos, 'fecha'));

    // ✅ TURNOS SOLICITADOS: Filtrar por created_at y agrupar por médico
    this.turnosPorMedico.set(
      await this.agruparTurnosSolicitadosPorMedico(turnos, this.filtroDesde, this.filtroHasta)
    );

    // ✅ TURNOS FINALIZADOS: Filtrar por fecha y agrupar por médico
    this.turnosFinalizados.set(
      await this.agruparTurnosFinalizadosPorMedico(turnos, this.filtroDesde, this.filtroHasta)
    );

    const logsFiltrados = logs.filter(log => {
      const fecha = this.extraerFecha(log.timestamp || log.fecha_ingreso);
      return fecha >= this.filtroDesde && fecha <= this.filtroHasta;
    });

    this.logsIngresoPorDia.set(this.agruparLogsPorDiaMejorado(logsFiltrados));

    // Dibujamos los gráficos
    this.renderCharts();
  } catch (error) {
    console.error('Error cargando datos:', error);
  }
}

// ✅ Nuevo método específico para turnos SOLICITADOS (filtra por created_at)
async agruparTurnosSolicitadosPorMedico(
  turnos: Turno[], 
  fechaDesde: string, 
  fechaHasta: string
): Promise<Record<string, number>> {
  
  console.log('=== DEBUG TURNOS SOLICITADOS ===');
  console.log('Fecha desde:', fechaDesde);
  console.log('Fecha hasta:', fechaHasta);
  console.log('Total turnos recibidos:', turnos.length);
  
  // Mostrar algunos ejemplos de created_at
  turnos.slice(0, 5).forEach((turno, index) => {
    const fechaCreacion = this.extraerFecha(turno.created_at);
    console.log(`Turno ${index + 1}:`, {
      id: turno.id,
      created_at_original: turno.created_at,
      created_at_extraido: fechaCreacion,
      cumple_filtro: fechaCreacion >= fechaDesde && fechaCreacion <= fechaHasta
    });
  });

  // Filtrar por created_at (fecha de solicitud)
  const turnosFiltrados = turnos.filter((t: Turno) => {
    const fechaCreacion = this.extraerFecha(t.created_at);
    const cumpleFiltro = fechaCreacion >= fechaDesde && fechaCreacion <= fechaHasta;
    return cumpleFiltro;
  });

  console.log(`Turnos solicitados filtrados: ${turnosFiltrados.length}`);
  console.log('=== FIN DEBUG ===');
  
  return await this.agruparPorMedicoConNombres(turnosFiltrados);
}

// ✅ Nuevo método específico para turnos FINALIZADOS (filtra por fecha)
async agruparTurnosFinalizadosPorMedico(
  turnos: Turno[], 
  fechaDesde: string, 
  fechaHasta: string
): Promise<Record<string, number>> {
  
  // Filtrar por fecha (fecha de realización) Y estado finalizado
  const turnosFiltrados = turnos.filter((t: Turno) => 
    t.estado === 'finalizado' && 
    t.fecha >= fechaDesde && 
    t.fecha <= fechaHasta
  );

  console.log(`Turnos finalizados filtrados por fecha: ${turnosFiltrados.length}`);
  
  return await this.agruparPorMedicoConNombres(turnosFiltrados);
}

  // Método mejorado para extraer solo la fecha de un timestamp
  extraerFecha(timestamp: string): string {
  if (!timestamp) {
    console.warn('Timestamp vacío, usando fecha actual');
    // Usar fecha actual en zona horaria argentina
    const fechaArgentina = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires'
    });
    return fechaArgentina;
  }
  
  try {
    const fecha = new Date(timestamp);
    // Verificar si la fecha es válida
    if (isNaN(fecha.getTime())) {
      console.warn('Fecha inválida:', timestamp);
      const fechaArgentina = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires'
      });
      return fechaArgentina;
    }
    
    // ✅ CAMBIO PRINCIPAL: Usar zona horaria de Argentina
    const fechaExtraida = fecha.toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires'
    }); // Formato YYYY-MM-DD en zona horaria argentina
    
    console.log(`Fecha extraída (Argentina): ${timestamp} -> ${fechaExtraida}`);
    return fechaExtraida;
  } catch (error) {
    console.error('Error al procesar fecha:', timestamp, error);
    const fechaArgentina = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires'
    });
    return fechaArgentina;
  }
}

  // Método mejorado para agrupar logs por día
  agruparLogsPorDiaMejorado(logs: LogIngreso[]): Record<string, number> {
  const agrupado: Record<string, number> = {};
  
  console.log('Procesando', logs.length, 'logs para agrupar por día');
  
  logs.forEach((log, index) => {
    // ✅ CAMBIO: Siempre usar timestamp primero
    const fechaCompleta = log.timestamp || log.fecha_ingreso;
    
    if (!fechaCompleta) {
      console.warn(`Log ${index} sin fecha válida:`, log);
      return;
    }
    
    const fechaSolo = this.extraerFecha(fechaCompleta);
    
    console.log(`Log ${index}:`, { 
      fechaCompleta, 
      fechaSolo, 
      usuario: log.usuario?.nombre 
    });
    
    agrupado[fechaSolo] = (agrupado[fechaSolo] || 0) + 1;
  });

  console.log('Logs agrupados por día (resultado final):', agrupado);
  
  return agrupado; // ✅ CAMBIO: Remover completarDiasFaltantes() ya que puede confundir
}

  // Nuevo método para completar días faltantes entre fechas
  completarDiasFaltantes(datos: Record<string, number>): Record<string, number> {
    const fechas = Object.keys(datos).sort();
    if (fechas.length === 0) return datos;

    const fechaInicio = new Date(fechas[0]);
    const fechaFin = new Date(fechas[fechas.length - 1]);
    const resultado: Record<string, number> = {};

    // Iterar día por día desde la primera hasta la última fecha
    const fechaActual = new Date(fechaInicio);
    while (fechaActual <= fechaFin) {
      const fechaStr = fechaActual.toISOString().split('T')[0];
      resultado[fechaStr] = datos[fechaStr] || 0;
      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    return resultado;
  }

  // Método para agrupar turnos por médico con nombres
  async agruparPorMedicoConNombres(turnos: Turno[]): Promise<Record<string, number>> {
    const agrupado: Record<string, number> = {};
    
    // Obtener IDs únicos de especialistas
    const especialistasIds = [...new Set(turnos.map(t => t.especialista_id))];
    
    // Obtener nombres para cada ID
    const nombresPromises = especialistasIds.map(async (id) => {
      try {
        const nombre = await this.db.obtenerNombreCompletoUsuarioPorId(parseInt(id));
        return { id, nombre: nombre || `Médico ID: ${id}` };
      } catch (error) {
        console.error(`Error obteniendo nombre del médico ${id}:`, error);
        return { id, nombre: `Médico ID: ${id}` };
      }
    });

    const nombresData = await Promise.all(nombresPromises);
    const mapaIdNombre = new Map(nombresData.map(item => [item.id, item.nombre]));

    // Agrupar turnos usando los nombres
    turnos.forEach(turno => {
      const nombreMedico = mapaIdNombre.get(turno.especialista_id) || `Médico ID: ${turno.especialista_id}`;
      agrupado[nombreMedico] = (agrupado[nombreMedico] || 0) + 1;
    });

    return agrupado;
  }

  agrupar(lista: any[], campo: string): Record<string, number> {
    return lista.reduce((acc, item) => {
      const clave = item[campo];
      acc[clave] = (acc[clave] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  renderCharts() {
    // Limpiar gráficos existentes
    this.limpiarGraficos();

    // 🍰 Gráfico de torta para especialidades
    this.crearGrafico(
      'chartEspecialidad',
      'Turnos por especialidad',
      this.turnosPorEspecialidad(),
      'pie'
    );

    // 📈 Gráfico de línea para turnos por día
    this.crearGrafico(
      'chartPorDia',
      'Turnos por día',
      this.turnosPorDia(),
      'line'
    );

    // 📊 Gráfico de barras para turnos por médico
    this.crearGrafico(
      'chartMedico',
      'Turnos solicitados por médico',
      this.turnosPorMedico(),
      'bar'
    );

    // 📊 Gráfico de barras para turnos finalizados
    this.crearGrafico(
      'chartFinalizados',
      'Turnos finalizados por médico',
      this.turnosFinalizados(),
      'bar'
    );

    // 📈 Gráfico de línea para ingresos por día
    this.crearGrafico(
      'chartLogsIngreso',
      'Ingresos al sistema por día',
      this.logsIngresoPorDia(),
      'line'
    );
  }

  limpiarGraficos() {
    const canvasIds = ['chartEspecialidad', 'chartPorDia', 'chartMedico', 'chartFinalizados', 'chartLogsIngreso'];
    canvasIds.forEach(id => {
      const canvas = document.getElementById(id) as HTMLCanvasElement;
      if (canvas) {
        const chart = Chart.getChart(canvas);
        if (chart) {
          chart.destroy();
        }
      }
    });
  }

  // ✨ Método renovado para crear diferentes tipos de gráficos
  crearGrafico(id: string, titulo: string, datos: Record<string, number>, tipoGrafico: 'bar' | 'pie' | 'line') {
    const ctx = document.getElementById(id) as HTMLCanvasElement;
    if (!ctx) return;

    let labels = Object.keys(datos);
    let valores = Object.values(datos);

    // Ordenar datos por fecha si es gráfico de línea (temporal)
    if (tipoGrafico === 'line') {
      const datosOrdenados = labels
        .map(fecha => ({ fecha, valor: datos[fecha] }))
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      
      labels = datosOrdenados.map(item => item.fecha);
      valores = datosOrdenados.map(item => item.valor);
    }

    // Configuración específica según el tipo de gráfico
    const configuracion: any = {
      type: tipoGrafico,
      data: {
        labels: labels,
        datasets: [{
          label: titulo,
          data: valores,
          borderWidth: tipoGrafico === 'line' ? 3 : 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { 
            display: tipoGrafico === 'pie', // Solo mostrar leyenda en gráfico de torta
            position: tipoGrafico === 'pie' ? 'right' : 'top'
          },
          title: { 
            display: true, 
            text: titulo,
            font: { size: 16, weight: 'bold' }
          }
        }
      }
    };

    // Configuraciones específicas por tipo
    if (tipoGrafico === 'pie') {
      // 🍰 Configuración para gráfico de torta
      const colores = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
      ];
      
      configuracion.data.datasets[0].backgroundColor = colores.slice(0, labels.length);
      configuracion.data.datasets[0].borderColor = '#ffffff';
      configuracion.data.datasets[0].borderWidth = 2;
      
    } else if (tipoGrafico === 'line') {
      // 📈 Configuración para gráfico de línea
      configuracion.data.datasets[0].borderColor = id === 'chartPorDia' ? '#10B981' : '#3B82F6';
      configuracion.data.datasets[0].backgroundColor = id === 'chartPorDia' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)';
      configuracion.data.datasets[0].fill = true;
      configuracion.data.datasets[0].tension = 0.4; // Línea suavizada
      configuracion.data.datasets[0].pointRadius = 6;
      configuracion.data.datasets[0].pointHoverRadius = 8;
      configuracion.data.datasets[0].pointBackgroundColor = id === 'chartPorDia' ? '#10B981' : '#3B82F6';
      
      // Escalas para gráficos de línea
      configuracion.options.scales = {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: 'rgba(0,0,0,0.1)' }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 0
          },
          grid: { color: 'rgba(0,0,0,0.1)' }
        }
      };
      
    } else {
      // 📊 Configuración para gráfico de barras
      const color = id === 'chartMedico' ? '#F59E0B' : '#8B5CF6';
      configuracion.data.datasets[0].backgroundColor = color;
      configuracion.data.datasets[0].borderColor = color;
      
      configuracion.options.scales = {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        },
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 0
          }
        }
      };
    }

    new Chart(ctx, configuracion);
  }

  crearTablaLogs() {
  const contenedor = document.getElementById('tablaLogs');
  if (!contenedor) return;

  const logs = this.logs();
  if (logs.length === 0) {
    contenedor.innerHTML = '<p>No hay logs de ingreso disponibles</p>';
    return;
  }

  let html = `
    <div class="tabla-logs">
      <h3>Últimos ingresos al sistema</h3>
      <table>
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Perfil</th>
            <th>Email</th>
            <th>Fecha y Hora</th>
          </tr>
        </thead>
        <tbody>
  `;

  // ✅ CAMBIO: Ordenar logs por timestamp antes de mostrar
  const logsOrdenados = [...logs].sort((a, b) => {
    const fechaA = new Date(a.timestamp || a.fecha_ingreso).getTime();
    const fechaB = new Date(b.timestamp || b.fecha_ingreso).getTime();
    return fechaB - fechaA; // Más recientes primero
  });

  logsOrdenados.slice(0, 20).forEach(log => {
    // ✅ CAMBIO: Priorizar timestamp y formatear correctamente para Argentina
    const fechaCompleta = log.timestamp || log.fecha_ingreso;
    const fecha = new Date(fechaCompleta);
    
    // ✅ CAMBIO: Formatear explícitamente para Argentina (UTC-3)
    const fechaHoraFormateada = fecha.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    html += `
      <tr>
        <td>${log.usuario?.nombre || 'N/A'} ${log.usuario?.apellido || ''}</td>
        <td><span class="badge badge-${log.usuario?.perfil || 'default'}">${log.usuario?.perfil || 'N/A'}</span></td>
        <td>${log.email}</td>
        <td>${fechaHoraFormateada}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  contenedor.innerHTML = html;
}

  agregarGraficoAPdf(doc: jsPDF, canvasId: string, yPos: number): number {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return yPos;

    const imgData = canvas.toDataURL('image/png');

    // Si estamos muy abajo en la hoja, agregar nueva página
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.addImage(imgData, 'PNG', 20, yPos, 170, 80); // ancho 170mm para casi todo el ancho de la página A4
    return yPos + 90;
  }

  async descargarPDF() {
    const doc = new jsPDF();
    let yPosition = 20;

    // Título principal
    doc.setFontSize(18);
    doc.text('Estadísticas de la Clínica', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.text('Fecha del reporte: ' + new Date().toLocaleString('es-AR'), 20, yPosition);
    yPosition += 20;

    // 1. Turnos por especialidad
    doc.setFontSize(14);
    doc.text('1. Turnos por especialidad:', 20, yPosition);
    yPosition += 10;
    yPosition = this.agregarGraficoAPdf(doc, 'chartEspecialidad', yPosition);

    const especialidades = this.turnosPorEspecialidad();
    for (const esp in especialidades) {
      doc.setFontSize(11);
      doc.text(`   • ${esp}: ${especialidades[esp]} turnos`, 25, yPosition);
      yPosition += 8;
    }
    yPosition += 10;

    // 2. Turnos por día (últimos 10 días)
    doc.setFontSize(14);
    doc.text('2. Turnos por día:', 20, yPosition);
    yPosition += 10;

    const turnosDia = this.turnosPorDia();
    const diasOrdenados = Object.keys(turnosDia).sort().slice(-10);
    
    for (const dia of diasOrdenados) {
      doc.setFontSize(11);
      doc.text(`   • ${dia}: ${turnosDia[dia]} turnos`, 25, yPosition);
      yPosition += 8;
    }
    yPosition += 10;
    yPosition = this.agregarGraficoAPdf(doc, 'chartPorDia', yPosition);

    
    // 3. Turnos por médico
    doc.setFontSize(14);
    doc.text('3. Turnos solicitados por médico:', 20, yPosition);
    yPosition += 10;

    const turnosMedico = this.turnosPorMedico();
    for (const medico in turnosMedico) {
      doc.setFontSize(11);
      doc.text(`   • ${medico}: ${turnosMedico[medico]} turnos`, 25, yPosition);
      yPosition += 8;
    }
    yPosition += 10;
    yPosition = this.agregarGraficoAPdf(doc, 'chartMedico', yPosition);


    // 4. Turnos finalizados por médico
    doc.setFontSize(14);
    doc.text('4. Turnos finalizados por médico:', 20, yPosition);
    yPosition += 10;

    const turnosFinalizados = this.turnosFinalizados();
    for (const medico in turnosFinalizados) {
      doc.setFontSize(11);
      doc.text(`   • ${medico}: ${turnosFinalizados[medico]} turnos`, 25, yPosition);
      yPosition += 8;
    }
    yPosition += 15;
    yPosition = this.agregarGraficoAPdf(doc, 'chartFinalizados', yPosition);

    // 5. Logs de ingreso por día
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.text('5. Ingresos al sistema por día:', 20, yPosition);
    yPosition += 10;

    const logsIngresosDia = this.logsIngresoPorDia();
    const diasLogsOrdenados = Object.keys(logsIngresosDia).sort();
    
    for (const dia of diasLogsOrdenados) {
      doc.setFontSize(11);
      doc.text(`   • ${dia}: ${logsIngresosDia[dia]} ingresos`, 25, yPosition);
      yPosition += 8;
    }
    yPosition += 15;
    yPosition = this.agregarGraficoAPdf(doc, 'chartLogsIngreso', yPosition);

    // 6. Últimos ingresos detallados
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.text('6. Últimos ingresos detallados:', 20, yPosition);
    yPosition += 10;

    const logs = this.logs().slice(0, 10);
    for (const log of logs) {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      const fechaCompleta = log.timestamp || log.fecha_ingreso;
      const fecha = new Date(fechaCompleta);
      const fechaHora = fecha.toLocaleString('es-AR');
      
      doc.setFontSize(10);
      doc.text(`   • ${log.usuario?.nombre || 'N/A'} ${log.usuario?.apellido || ''} (${log.usuario?.perfil || 'N/A'})`, 25, yPosition);
      yPosition += 6;
      doc.text(`     ${log.email} - ${fechaHora}`, 25, yPosition);
      yPosition += 10;
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Página ${i} de ${totalPages}`, 170, 285);
    }

    doc.save(`estadisticas-clinica-${new Date().toISOString().split('T')[0]}.pdf`);
  }

    get logsOrdenados(): LogIngreso[] {
    return [...this.logs()].sort((a, b) => {
      const fechaA = new Date(a.timestamp || a.fecha_ingreso).getTime();
      const fechaB = new Date(b.timestamp || b.fecha_ingreso).getTime();
      return fechaB - fechaA; // Más recientes primero
    });
  }
}