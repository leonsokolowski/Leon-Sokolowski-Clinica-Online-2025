import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import { DatabaseService } from '../../services/database.service';

interface Turno {
  id: number;
  fecha: string;
  estado: string;
  especialidad: string;
  especialista_id: string;
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
  imports: [CommonModule],
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
      this.logs.set(logs);

      // Agrupamos por especialidad y por día
      this.turnosPorEspecialidad.set(this.agrupar(turnos, 'especialidad'));
      this.turnosPorDia.set(this.agrupar(turnos, 'fecha'));

      // Procesamos logs de ingreso por día - CORREGIDO: extraer solo la fecha
      const logsConFechaSolo = logs.map(log => ({
        ...log,
        fecha_solo: this.extraerFecha(log.timestamp || log.fecha_ingreso)
      }));
      this.logsIngresoPorDia.set(this.agrupar(logsConFechaSolo, 'fecha_solo'));

      // Filtro de fechas (puede venir de inputs en el futuro)
      const fechaInicio = '2025-01-01';
      const fechaFin = '2025-12-31';

      const enRango = turnos.filter((t: Turno) =>
        t.fecha >= fechaInicio && t.fecha <= fechaFin
      );

      // CORREGIDO: Agrupamos turnos por médico con nombres
      this.turnosPorMedico.set(await this.agruparPorMedicoConNombres(enRango));

      // CORREGIDO: Agrupamos turnos finalizados por médico con nombres
      this.turnosFinalizados.set(
        await this.agruparPorMedicoConNombres(
          enRango.filter((t: Turno) => t.estado === 'finalizado')
        )
      );

      // Dibujamos los gráficos
      this.renderCharts();
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  }

  // NUEVO: Método para extraer solo la fecha de un timestamp
  extraerFecha(timestamp: string): string {
    const fecha = new Date(timestamp);
    return fecha.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  }

  // NUEVO: Método para agrupar turnos por médico con nombres
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

    this.crearGrafico(
      'chartEspecialidad',
      'Turnos por especialidad',
      this.turnosPorEspecialidad(),
      'skyblue'
    );

    this.crearGrafico(
      'chartPorDia',
      'Turnos por día',
      this.turnosPorDia(),
      'green'
    );

    this.crearGrafico(
      'chartMedico',
      'Turnos solicitados por médico',
      this.turnosPorMedico(),
      'orange'
    );

    this.crearGrafico(
      'chartFinalizados',
      'Turnos finalizados por médico',
      this.turnosFinalizados(),
      'purple'
    );

    this.crearGrafico(
      'chartLogsIngreso',
      'Ingresos al sistema por día',
      this.logsIngresoPorDia(),
      '#3B82F6'
    );

    // Crear tabla de logs detallada
    this.crearTablaLogs();
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

  crearGrafico(id: string, titulo: string, datos: Record<string, number>, color: string) {
    const ctx = document.getElementById(id) as HTMLCanvasElement;
    if (!ctx) return;

    // MEJORADO: Ordenar datos por fecha si es el gráfico de logs por día
    let labels = Object.keys(datos);
    let valores = Object.values(datos);

    if (id === 'chartLogsIngreso' || id === 'chartPorDia') {
      // Ordenar fechas cronológicamente
      const datosOrdenados = labels
        .map(fecha => ({ fecha, valor: datos[fecha] }))
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      
      labels = datosOrdenados.map(item => item.fecha);
      valores = datosOrdenados.map(item => item.valor);
    }

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: titulo,
          data: valores,
          backgroundColor: color,
          borderColor: color,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: titulo }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 0
            }
          }
        }
      }
    });
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
              <th>Fecha</th>
              <th>Hora</th>
            </tr>
          </thead>
          <tbody>
    `;

    logs.slice(0, 20).forEach(log => {
      const fecha = new Date(log.timestamp);
      const fechaFormateada = fecha.toLocaleDateString('es-AR');
      const horaFormateada = fecha.toLocaleTimeString('es-AR');
      
      html += `
        <tr>
          <td>${log.usuario?.nombre || 'N/A'} ${log.usuario?.apellido || ''}</td>
          <td><span class="badge badge-${log.usuario?.perfil || 'default'}">${log.usuario?.perfil || 'N/A'}</span></td>
          <td>${log.email}</td>
          <td>${fechaFormateada}</td>
          <td>${horaFormateada}</td>
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

    // 3. Turnos por médico - CORREGIDO: ya muestra nombres
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

    // 4. Turnos finalizados por médico - CORREGIDO: ya muestra nombres
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

    // 5. Logs de ingreso por día - NUEVO: mostrar estadísticas por día
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

      const fecha = new Date(log.timestamp);
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
}