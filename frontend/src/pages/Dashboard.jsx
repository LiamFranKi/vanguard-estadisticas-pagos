import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import { listarAlumnosPorGrado } from '../services/alumnos';
import { getTopDeudores, getEstadisticasPorMes, getDeudaAlumno, getDeudaGrado } from '../services/estadisticas';
import { useAño } from '../contexts/AñoContext';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';
import './Dashboard.css';

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const { añoActual, cambiarAño, obtenerAñosParaSelect, crearAño } = useAño();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [ranking, setRanking] = useState({ topAlumnos: [], topGrados: [] });
  const [rankingLoading, setRankingLoading] = useState(false);
  const [mesesData, setMesesData] = useState([]);
  const [matriculaData, setMatriculaData] = useState({ pagado: 0, deuda: 0 });
  const [mesesLoading, setMesesLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [gradoSeleccionado, setGradoSeleccionado] = useState(null);
  const [alumnosGrado, setAlumnosGrado] = useState([]);
  const [filtroAlumnos, setFiltroAlumnos] = useState('todos'); // 'todos' | 'deudores' | 'pagadores'
  
  // Modal de saldos por grado (para meses)
  const [modalMesOpen, setModalMesOpen] = useState(false);
  const [modalMesLoading, setModalMesLoading] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState(null);
  const [saldosPorGrado, setSaldosPorGrado] = useState([]);
  
  // Modal de alumnos deudores por aula y mes (tercer nivel)
  const [modalAlumnosOpen, setModalAlumnosOpen] = useState(false);
  const [modalAlumnosLoading, setModalAlumnosLoading] = useState(false);
  const [aulaSeleccionada, setAulaSeleccionada] = useState(null);
  const [alumnosDeudoresMes, setAlumnosDeudoresMes] = useState([]);
  
  // Modal de estadísticas generales (todos los años)
  const [modalGeneralOpen, setModalGeneralOpen] = useState(false);
  const [modalGeneralLoading, setModalGeneralLoading] = useState(false);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState([]);
  
  // Fecha del último archivo de pagadores
  const [fechaUltimaActualizacion, setFechaUltimaActualizacion] = useState(null);

  // Abrir modal y cargar alumnos del grado
  const abrirModalGrado = async (grado) => {
    try {
      setGradoSeleccionado(grado);
      setModalOpen(true);
      setModalLoading(true);
      const res = await listarAlumnosPorGrado({ grado_id: grado.id, año: añoActual, page: 1, limit: 500 });
      setAlumnosGrado(res?.data || []);
    } catch (e) {
      console.error('Error cargando alumnos del grado:', e);
      setAlumnosGrado([]);
    } finally {
      setModalLoading(false);
    }
  };

  // Abrir modal de saldos por grado para un mes específico
  const abrirModalMes = async (concepto, mes) => {
    try {
      setMesSeleccionado({ nombre: concepto, mes });
      setModalMesOpen(true);
      setModalMesLoading(true);
      const response = await axios.get('/api/estadisticas/saldo-por-grado', {
        params: { año: añoActual, mes }
      });
      setSaldosPorGrado(response.data?.data || []);
    } catch (e) {
      console.error('Error cargando saldos por grado:', e);
      setSaldosPorGrado([]);
    } finally {
      setModalMesLoading(false);
    }
  };

  // Abrir modal de alumnos deudores por aula y mes (tercer nivel)
  const abrirModalAlumnos = async (aula) => {
    try {
      setAulaSeleccionada(aula);
      setModalAlumnosOpen(true);
      setModalAlumnosLoading(true);
      const response = await axios.get('/api/estadisticas/alumnos-deudores-mes', {
        params: { 
          año: añoActual, 
          grado_id: aula.grado_id,
          mes: mesSeleccionado?.mes 
        }
      });
      setAlumnosDeudoresMes(response.data?.data || []);
    } catch (e) {
      console.error('Error cargando alumnos deudores:', e);
      setAlumnosDeudoresMes([]);
    } finally {
      setModalAlumnosLoading(false);
    }
  };

  // Abrir modal de estadísticas generales (todos los años)
  const abrirModalGeneral = async () => {
    try {
      setModalGeneralOpen(true);
      setModalGeneralLoading(true);
      const response = await axios.get('/api/estadisticas/resumen-por-anios');
      setEstadisticasGenerales(response.data?.data || []);
    } catch (e) {
      console.error('Error cargando estadísticas generales:', e);
      setEstadisticasGenerales([]);
    } finally {
      setModalGeneralLoading(false);
    }
  };


  // Exportar CSV del modal
  const exportarCSV = () => {
    if (!alumnosGrado?.length) return;
    const headers = ['DNI','Alumno','Deuda Total'];
    const rows = alumnosGrado.map(a => [a.dni, `${a.nombres} ${a.apellidos}`.trim(), (a.deuda_total || 0)]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const nombre = (gradoSeleccionado?.nombre || 'grado').replace(/\s*[-–—]\s*20\d{2}\s*$/i, '');
    link.setAttribute('download', `alumnos_${nombre}_${añoActual}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Datos filtrados según selección
  const alumnosFiltrados = (alumnosGrado || []).filter(a => {
    if (filtroAlumnos === 'deudores') return (a.deuda_total || 0) > 0;
    if (filtroAlumnos === 'pagadores') return (a.total_pagado || 0) > 0;
    return true;
  });

  // Totales en el modal (después de definir alumnosFiltrados)
  const totalFiltrados = alumnosFiltrados.length;
  const sumaPagado = alumnosFiltrados.reduce((acc, a) => acc + (Number(a.total_pagado) || 0), 0);
  const sumaDeuda = alumnosFiltrados.reduce((acc, a) => acc + (Number(a.deuda_total) || 0), 0);
  const sumaSaldo = Math.max(sumaDeuda - sumaPagado, 0);

  // Exportar Excel (HTML -> .xls)
  const exportarExcel = () => {
    const nombreGrado = (gradoSeleccionado?.nombre || 'grado').replace(/\s*[-–—]\s*20\d{2}\s*$/i, '');
    const title = `Alumnos - ${nombreGrado} (${añoActual})`;
    const rows = alumnosFiltrados.map(a => {
      const saldo = Math.max(Number(a.deuda_total || 0) - Number(a.total_pagado || 0), 0);
      return `
      <tr>
        <td>${a.dni || ''}</td>
        <td>${(a.apellidos || '') + ' ' + (a.nombres || '')}</td>
        <td style="text-align:right">${(a.total_pagado || 0).toLocaleString('es-PE')}</td>
        <td style="text-align:right">${(a.deuda_total || 0).toLocaleString('es-PE')}</td>
        <td style="text-align:right">${saldo.toLocaleString('es-PE')}</td>
      </tr>`;
    }).join('');
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${title}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <meta charset="UTF-8" />
      <style>
        table{border-collapse:collapse;width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:12px}
        th,td{border:1px solid #ddd;padding:8px}
        thead tr{background:#e6f0fb}
        th{text-align:left}
      </style>
      </head>
      <body>
        <h3>${title}</h3>
        <table>
          <thead>
            <tr>
              <th>DNI</th>
              <th>Alumno</th>
              <th>Pagado</th>
              <th>Deuda Total</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `alumnos_${nombreGrado}_${añoActual}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportar PDF (ventana de impresión con estilos)
  const exportarPDF = () => {
    const nombre = (gradoSeleccionado?.nombre || 'grado').replace(/\s*[-–—]\s*20\d{2}\s*$/i, '');
    const title = `Alumnos - ${nombre} (${añoActual})`;
    const rows = alumnosFiltrados.map(a => {
      const saldo = Math.max(Number(a.deuda_total || 0) - Number(a.total_pagado || 0), 0);
      return `
      <tr>
        <td>${a.dni || ''}</td>
        <td>${(a.apellidos || '') + ' ' + (a.nombres || '')}</td>
        <td style="text-align:right">S/ ${(a.total_pagado || 0).toLocaleString('es-PE')}</td>
        <td style="text-align:right">S/ ${(a.deuda_total || 0).toLocaleString('es-PE')}</td>
        <td style="text-align:right">S/ ${saldo.toLocaleString('es-PE')}</td>
      </tr>`;
    }).join('');
    const html = `
      <html><head><meta charset="UTF-8" />
      <title>${title}</title>
      <style>
        body{font-family:Segoe UI,Arial,sans-serif;padding:20px}
        h3{margin:0 0 12px 0}
        .meta{margin-bottom:10px;color:#555}
        table{border-collapse:collapse;width:100%;font-size:12px}
        th,td{border:1px solid #ddd;padding:8px}
        thead tr{background:#e6f0fb}
        th{text-align:left}
      </style></head>
      <body>
        <h3>${title}</h3>
        <div class="meta">Filtro: ${filtroAlumnos}</div>
        <table>
          <thead>
            <tr>
              <th>DNI</th>
              <th>Alumno</th>
              <th>Pagado</th>
              <th>Deuda Total</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.onload=()=>{window.print(); setTimeout(()=>window.close(), 300);}</script>
      </body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  // Detectar tipo de dispositivo
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width <= 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Cargar ranking y estadísticas por meses cuando cambia el año
  useEffect(() => {
    const loadStats = async () => {
      try {
        setRankingLoading(true);
        const r = await getTopDeudores({ año: añoActual, limit: 10000 });
        setRanking({ topAlumnos: r?.topAlumnos || [], topGrados: r?.topGrados || [] });
      } catch (e) {
        console.warn('No se pudo cargar ranking deudores:', e?.response?.status || e?.message);
        setRanking({ topAlumnos: [], topGrados: [] });
      } finally {
        setRankingLoading(false);
      }
      try {
        setMesesLoading(true);
        const m = await getEstadisticasPorMes({ año: añoActual });
        // Guardar solo meses de Mar..Dic
        setMesesData((m?.meses || []).filter(x => (x?.mes||0) >= 3));
        setMatriculaData(m?.matricula || { pagado: 0, deuda: 0 });
      } catch (e) {
        console.warn('No se pudo cargar estadísticas por meses:', e?.response?.status || e?.message);
        setMesesData([]);
        setMatriculaData({ pagado: 0, deuda: 0 });
      } finally {
        setMesesLoading(false);
      }
      // Cargar fecha del último archivo de pagadores
      try {
        const response = await axios.get('/api/estadisticas/auditoria/ultimo-pagadores', {
          params: { año: añoActual }
        });
        if (response.data?.success && response.data?.encontrado) {
          setFechaUltimaActualizacion(response.data.created_at || new Date(response.data.created_at));
        } else {
          setFechaUltimaActualizacion(null);
        }
      } catch (e) {
        console.warn('No se pudo cargar fecha del último archivo:', e?.response?.status || e?.message);
        setFechaUltimaActualizacion(null);
      }
    };
    loadStats();
  }, [añoActual]);

  const mesesNombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Handlers detalle ranking
  const handleClickAlumno = async (alumno) => {
    try {
      Swal.fire({ title: 'Cargando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, showConfirmButton: false });
      const data = await getDeudaAlumno({ alumnoId: alumno.alumno_id, año: añoActual });
      const mesesFiltrados = (data.meses || []).filter(m=> (m?.mes||0) >= 3);
      const totalPagado = mesesFiltrados.reduce((a,b)=>a+Number(b.pagado||0),0);
      const totalDeuda  = mesesFiltrados.reduce((a,b)=>a+Number(b.deuda ||0),0);
      const totalSaldo  = mesesFiltrados.reduce((a,b)=>a+Number(b.saldo ||0),0);
      const rows = mesesFiltrados.map(m => `
        <tr>
          <td>${mesesNombres[m.mes-1]}</td>
          <td style=\"text-align:right\">S/ ${(m.pagado||0).toLocaleString('es-PE')}</td>
          <td style=\"text-align:right\">S/ ${(m.deuda||0).toLocaleString('es-PE')}</td>
          <td style=\"text-align:right\">S/ ${(m.saldo||0).toLocaleString('es-PE')}</td>
        </tr>`).join('');
      const html = `
        <div style="text-align:left">
          <div style="margin-bottom:12px;font-weight:700;font-size:14px;">${alumno.nombre} - ${alumno.dni}</div>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#eef"><th style="text-align:left">Concepto</th><th style="text-align:right">Pagado</th><th style="text-align:right">Deuda</th><th style="text-align:right">Saldo</th></tr></thead>
            <tbody>
              <tr><td>Matrícula</td><td style=\"text-align:right\">S/ ${(data.matricula?.pagado||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${(data.matricula?.deuda||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${((data.matricula?.saldo)||0).toLocaleString('es-PE')}</td></tr>
              ${rows}
              <tr style=\"font-weight:700;background:#f8fafc\"><td>Total</td><td style=\"text-align:right\">S/ ${totalPagado.toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${totalDeuda.toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${totalSaldo.toLocaleString('es-PE')}</td></tr>
            </tbody>
          </table>
        </div>`;
      Swal.fire({ title: 'Detalle de Deuda', html, width: 900, background: '#fff' });
    } catch (e) {
      Swal.fire('Error', 'No se pudo cargar el detalle', 'error');
    }
  };

  const handleClickGrado = async (grado) => {
    try {
      Swal.fire({ title: 'Cargando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false, showConfirmButton: false });
      const data = await getDeudaGrado({ gradoId: grado.grado_id, año: añoActual });
      const mesesFiltradosG = (data.meses || []).filter(m=> (m?.mes||0) >= 3);
      const totalPagadoG = mesesFiltradosG.reduce((a,b)=>a+Number(b.pagado||0),0);
      const totalDeudaG  = mesesFiltradosG.reduce((a,b)=>a+Number(b.deuda ||0),0);
      const totalSaldoG  = mesesFiltradosG.reduce((a,b)=>a+Number(b.saldo ||0),0);
      const rows = mesesFiltradosG.map(m => `
        <tr>
          <td>${mesesNombres[m.mes-1]}</td>
          <td style="text-align:right">S/ ${(m.pagado||0).toLocaleString('es-PE')}</td>
          <td style="text-align:right">S/ ${(m.deuda||0).toLocaleString('es-PE')}</td>
          <td style="text-align:right">S/ ${(m.saldo||0).toLocaleString('es-PE')}</td>
        </tr>`).join('');
      const html = `
        <div style="text-align:left">
          <div style="margin-bottom:12px;font-weight:700;font-size:14px;">${(grado.grado||'').replace(/\s*[-–—]\s*20\d{2}\s*$/i, '')}</div>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#eef"><th style="text-align:left">Concepto</th><th style="text-align:right">Pagado</th><th style="text-align:right">Deuda</th><th style="text-align:right">Saldo</th></tr></thead>
            <tbody>
              <tr><td>Matrícula</td><td style="text-align:right">S/ ${(data.matricula?.pagado||0).toLocaleString('es-PE')}</td><td style="text-align:right">S/ ${(data.matricula?.deuda||0).toLocaleString('es-PE')}</td><td style="text-align:right">S/ ${((data.matricula?.saldo)||0).toLocaleString('es-PE')}</td></tr>
              ${rows}
              <tr style="font-weight:700;background:#f8fafc"><td>Total</td><td style="text-align:right">S/ ${totalPagadoG.toLocaleString('es-PE')}</td><td style="text-align:right">S/ ${totalDeudaG.toLocaleString('es-PE')}</td><td style="text-align:right">S/ ${totalSaldoG.toLocaleString('es-PE')}</td></tr>
            </tbody>
          </table>
        </div>`;
      Swal.fire({ title: 'Detalle por Grado', html, width: 900, background: '#fff' });
    } catch (e) {
      Swal.fire('Error', 'No se pudo cargar el detalle', 'error');
    }
  };

  const exportarRankingExcel = (tipo) => {
    const alumnos = tipo === 'alumnos';
    const title = alumnos ? 'Top Alumnos Deudores' : 'Top Grados Deudores';
    const rows = (alumnos ? ranking.topAlumnos : ranking.topGrados).map(x => alumnos
      ? `<tr><td>${x.dni || ''}</td><td>${x.nombre || ''}</td><td>${x.grado || ''}</td><td style="text-align:right">${(x.total_pagado||0).toLocaleString('es-PE')}</td><td style="text-align:right">${(x.deuda_total||0).toLocaleString('es-PE')}</td><td style="text-align:right">${(x.deuda_pendiente||0).toLocaleString('es-PE')}</td></tr>`
      : `<tr><td>${x.grado || ''}</td><td style="text-align:right">${(x.deuda_total||0).toLocaleString('es-PE')}</td><td style="text-align:right">${(x.total_pagado||0).toLocaleString('es-PE')}</td><td style="text-align:right">${(x.deuda_pendiente||0).toLocaleString('es-PE')}</td></tr>`
    ).join('');
    const thead = alumnos
      ? '<tr><th>DNI</th><th>Alumno</th><th>Grado</th><th>Pagado</th><th>Deuda Total</th><th>Saldo a Pagar</th></tr>'
      : '<tr><th>Grado</th><th>Deuda Total</th><th>Pagado</th><th>Saldo a Pagar</th></tr>';
    const html = `<!doctype html><html><head><meta charset="UTF-8"/><style>table{border-collapse:collapse;width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:12px}th,td{border:1px solid #ddd;padding:8px}thead tr{background:#e6f0fb}th{text-align:left}</style></head><body><h3>${title} (${añoActual})</h3><table><thead>${thead}</thead><tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${alumnos ? 'top_alumnos' : 'top_grados'}_${añoActual}.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const exportarRankingPDF = (tipo) => {
    const alumnos = tipo === 'alumnos';
    const title = alumnos ? 'Top Alumnos Deudores' : 'Top Grados Deudores';
    const rows = (alumnos ? ranking.topAlumnos : ranking.topGrados).map(x => alumnos
      ? `<tr><td>${x.dni || ''}</td><td>${x.nombre || ''}</td><td>${x.grado || ''}</td><td style=\"text-align:right\">S/ ${(x.total_pagado||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${(x.deuda_total||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${(x.deuda_pendiente||0).toLocaleString('es-PE')}</td></tr>`
      : `<tr><td>${x.grado || ''}</td><td style=\"text-align:right\">S/ ${(x.deuda_total||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${(x.total_pagado||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${(x.deuda_pendiente||0).toLocaleString('es-PE')}</td></tr>`
    ).join('');
    const thead = alumnos
      ? '<tr><th>DNI</th><th>Alumno</th><th>Grado</th><th>Pagado</th><th>Deuda Total</th><th>Saldo a Pagar</th></tr>'
      : '<tr><th>Grado</th><th>Deuda Total</th><th>Pagado</th><th>Saldo a Pagar</th></tr>';
    const html = `<!doctype html><html><head><meta charset=\"UTF-8\"/><title>${title}</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:20px}h3{margin:0 0 12px 0}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ddd;padding:8px}thead tr{background:#e6f0fb}th{text-align:left}</style></head><body><h3>${title} (${añoActual})</h3><table><thead>${thead}</thead><tbody>${rows}</tbody></table><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script></body></html>`;
    const win = window.open('', '_blank'); if (!win) return; win.document.open(); win.document.write(html); win.document.close();
  };

  const exportarMesesExcel = () => {
    const title = `Estadísticas por Mes (${añoActual})`;
    const mesesFiltrados = (mesesData || []).filter(m=> (m?.mes||0) >= 3);
    const rows = [
      `<tr><td>Matrícula</td><td style=\"text-align:right\">${(matriculaData.deuda||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">${(matriculaData.pagado||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">${Math.max(Number(matriculaData.deuda||0)-Number(matriculaData.pagado||0),0).toLocaleString('es-PE')}</td></tr>`,
      ...mesesFiltrados.map(m => `<tr><td>${mesesNombres[m.mes-1]}</td><td style=\"text-align:right\">${(m.deuda||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">${(m.pagado||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">${Math.max(Number(m.deuda||0)-Number(m.pagado||0),0).toLocaleString('es-PE')}</td></tr>`)
    ].join('');
    const totalDeuda = (Number(matriculaData.deuda||0) + mesesFiltrados.reduce((a,b)=>a+Number(b.deuda||0),0));
    const totalPagado = (Number(matriculaData.pagado||0) + mesesFiltrados.reduce((a,b)=>a+Number(b.pagado||0),0));
    const totalSaldo = Math.max(totalDeuda - totalPagado, 0);
    const html = `<!doctype html><html><head><meta charset=\"UTF-8\"/><style>table{border-collapse:collapse;width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:12px}th,td{border:1px solid #ddd;padding:8px}thead tr{background:#e6f0fb}th{text-align:left}</style></head><body><h3>${title}</h3><table><thead><tr><th>Concepto</th><th style=\"text-align:right\">Deuda Total</th><th style=\"text-align:right\">Pagado</th><th style=\"text-align:right\">Saldo a Pagar</th></tr></thead><tbody>${rows}<tr style=\"font-weight:700;background:#f8fafc\"><td>Total</td><td style=\"text-align:right\">${totalDeuda.toLocaleString('es-PE')}</td><td style=\"text-align:right\">${totalPagado.toLocaleString('es-PE')}</td><td style=\"text-align:right\">${totalSaldo.toLocaleString('es-PE')}</td></tr></tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `estadisticas_meses_${añoActual}.xls`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const exportarMesesPDF = () => {
    const title = `Estadísticas por Mes (${añoActual})`;
    const mesesFiltrados = (mesesData || []).filter(m=> (m?.mes||0) >= 3);
    const rows = [
      `<tr><td>Matrícula</td><td style=\"text-align:right\">S/ ${(matriculaData.deuda||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${(matriculaData.pagado||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${Math.max(Number(matriculaData.deuda||0)-Number(matriculaData.pagado||0),0).toLocaleString('es-PE')}</td></tr>`,
      ...mesesFiltrados.map(m => `<tr><td>${mesesNombres[m.mes-1]}</td><td style=\"text-align:right\">S/ ${(m.deuda||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${(m.pagado||0).toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${Math.max(Number(m.deuda||0)-Number(m.pagado||0),0).toLocaleString('es-PE')}</td></tr>`)
    ].join('');
    const totalDeuda = (Number(matriculaData.deuda||0) + mesesFiltrados.reduce((a,b)=>a+Number(b.deuda||0),0));
    const totalPagado = (Number(matriculaData.pagado||0) + mesesFiltrados.reduce((a,b)=>a+Number(b.pagado||0),0));
    const totalSaldo = Math.max(totalDeuda - totalPagado, 0);
    const html = `<!doctype html><html><head><meta charset=\"UTF-8\"/><title>${title}</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:20px}h3{margin:0 0 12px 0}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ddd;padding:8px}thead tr{background:#e6f0fb}th{text-align:left}</style></head><body><h3>${title}</h3><table><thead><tr><th>Concepto</th><th style=\"text-align:right\">Deuda Total</th><th style=\"text-align:right\">Pagado</th><th style=\"text-align:right\">Saldo a Pagar</th></tr></thead><tbody>${rows}<tr style=\"font-weight:700;background:#f8fafc\"><td>Total</td><td style=\"text-align:right\">S/ ${totalDeuda.toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${totalPagado.toLocaleString('es-PE')}</td><td style=\"text-align:right\">S/ ${totalSaldo.toLocaleString('es-PE')}</td></tr></tbody></table><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script></body></html>`;
    const win = window.open('', '_blank'); if (!win) return; win.document.open(); win.document.write(html); win.document.close();
  };

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  // Cargar estadísticas cuando cambia el año
  useEffect(() => {
    fetchDashboardStats();
  }, [añoActual]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/estadisticas/dashboard?año=${añoActual}`);
      setStats(response.data?.data || response.data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Configuración de gráficos responsive
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isMobile ? 'bottom' : 'top',
        labels: {
          font: {
            size: isMobile ? 10 : 12
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: isMobile ? 10 : 12
          }
        }
      },
      x: {
        ticks: {
          font: {
            size: isMobile ? 10 : 12
          }
        }
      }
    }
  };

  // Datos para gráfico de ingresos por mes
  const ingresosData = {
    labels: ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'],
    datasets: [
      {
        label: 'Ingresos por Mes',
        data: stats?.ingresosPorMes || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(25, 118, 210, 0.8)',
        borderColor: 'rgba(25, 118, 210, 1)',
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      }
    ]
  };

  // Datos para gráfico de ingresos vs deudas
  const comparacionData = {
    labels: ['Ingresos', 'Deudas'],
    datasets: [
      {
        data: [
          stats?.resumen?.totalIngresos || 0,
          stats?.resumen?.totalDeudas || 0
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando estadísticas...</p>
        </div>

        {/* Ranking de Deudores */}
        <div className="ranking-section">
          <h2>🏆 Ranking de Deudores</h2>
          <div className="ranking-grid">
            <div className="ranking-card">
              <div className="ranking-header">
                <h3>Top Alumnos</h3>
                <div className="ranking-actions">
                  <button className="export-btn" onClick={()=>exportarRankingExcel('alumnos')} disabled={rankingLoading || !ranking.topAlumnos.length}>Excel</button>
                  <button className="export-btn" onClick={()=>exportarRankingPDF('alumnos')} disabled={rankingLoading || !ranking.topAlumnos.length}>PDF</button>
                </div>
              </div>
              {rankingLoading ? <div style={{padding:'0.5rem'}}>Cargando...</div> : (
                <table className="table">
                  <thead><tr><th>DNI</th><th>Alumno</th><th>Grado</th><th style={{textAlign:'right'}}>Deuda Pendiente</th></tr></thead>
                  <tbody>
                    {ranking.topAlumnos.map(a => (
                      <tr key={a.alumno_id} onClick={()=>handleClickAlumno(a)} style={{cursor:'pointer'}}><td>{a.dni}</td><td>{a.nombre}</td><td>{a.grado}</td><td style={{textAlign:'right'}}>S/ {(a.deuda_pendiente||0).toLocaleString()}</td></tr>
                    ))}
                    {!ranking.topAlumnos.length && <tr><td colSpan={4} style={{textAlign:'center',padding:'0.75rem'}}>Sin datos para el año seleccionado. Aún no hay deudores registrados.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
            <div className="ranking-card">
              <div className="ranking-header">
                <h3>Top Grados</h3>
                <div className="ranking-actions">
                  <button className="export-btn" onClick={()=>exportarRankingExcel('grados')} disabled={rankingLoading || !ranking.topGrados.length}>Excel</button>
                  <button className="export-btn" onClick={()=>exportarRankingPDF('grados')} disabled={rankingLoading || !ranking.topGrados.length}>PDF</button>
                </div>
              </div>
              {rankingLoading ? <div style={{padding:'0.5rem'}}>Cargando...</div> : (
                <table className="table">
                  <thead><tr><th>Grado</th><th style={{textAlign:'right'}}>Deuda Total</th><th style={{textAlign:'right'}}>Pagado</th><th style={{textAlign:'right'}}>Saldo a Pagar</th></tr></thead>
                  <tbody>
                    {ranking.topGrados.map(g => (
                      <tr key={g.grado_id} onClick={()=>handleClickGrado(g)} style={{cursor:'pointer'}}><td>{g.grado}</td><td style={{textAlign:'right'}}>S/ {(g.deuda_total||0).toLocaleString()}</td><td style={{textAlign:'right'}}>S/ {(g.total_pagado||0).toLocaleString()}</td><td style={{textAlign:'right'}}>S/ {(g.deuda_pendiente||0).toLocaleString()}</td></tr>
                    ))}
                    {!ranking.topGrados.length && <tr><td colSpan={4} style={{textAlign:'center',padding:'0.75rem'}}>Sin datos para el año seleccionado. Aún no hay deudas por grado.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Estadísticas por Matrícula y Meses */}
        <div className="meses-section">
          <h2>📅 Estadísticas por Matrícula y Meses</h2>
          <div className="meses-actions" style={{display:'flex',gap:8,justifyContent:'flex-end',marginBottom:8}}>
            <button className="export-btn" onClick={exportarMesesExcel} disabled={mesesLoading || !mesesData.length}>Excel</button>
            <button className="export-btn" onClick={exportarMesesPDF} disabled={mesesLoading || !mesesData.length}>PDF</button>
          </div>
          {mesesLoading ? <div style={{padding:'0.5rem'}}>Cargando...</div> : (
            <table className="table">
              <thead><tr><th>Concepto</th><th style={{textAlign:'right'}}>Pagado</th><th style={{textAlign:'right'}}>Deuda</th><th style={{textAlign:'right'}}>Total a Pagar</th></tr></thead>
              <tbody>
                {/* Fila Matrícula */}
                <tr>
                  <td>Matrícula</td>
                  <td style={{textAlign:'right'}}>S/ {(matriculaData.pagado||0).toLocaleString()}</td>
                  <td style={{textAlign:'right'}}>S/ {(matriculaData.deuda||0).toLocaleString()}</td>
                  <td style={{textAlign:'right'}}>S/ {((Number(matriculaData.pagado||0)+Number(matriculaData.deuda||0))||0).toLocaleString()}</td>
                </tr>
                {/* Meses Mar-Dic */}
                {mesesData.filter(m => (m?.mes||0) >= 3).map(m => (
                  <tr key={m.mes}>
                    <td>{mesesNombres[m.mes-1]}</td>
                    <td style={{textAlign:'right'}}>S/ {(m.pagado||0).toLocaleString()}</td>
                    <td style={{textAlign:'right'}}>S/ {(m.deuda||0).toLocaleString()}</td>
                    <td style={{textAlign:'right'}}>S/ {((Number(m.pagado||0)+Number(m.deuda||0))||0).toLocaleString()}</td>
                  </tr>
                ))}
                {/* Sin datos */}
                {!mesesData.length && (
                  <tr><td colSpan={4} style={{textAlign:'center',padding:'0.75rem'}}>Sin datos para el año seleccionado. Aún no hay estadísticas por mes.</td></tr>
                )}
                {/* Totales */}
                {mesesData.length > 0 && (
                  (()=>{
                    const mesesFiltrados = (mesesData || []).filter(m => (m?.mes||0) >= 3);
                    const totalPagado = (Number(matriculaData.pagado||0) + mesesFiltrados.reduce((a,b)=>a+Number(b.pagado||0),0));
                    const totalDeuda = (Number(matriculaData.deuda||0) + mesesFiltrados.reduce((a,b)=>a+Number(b.deuda||0),0));
                    const totalPagar = totalPagado + totalDeuda;
                    return (
                      <tr style={{fontWeight:700, background:'#f8fafc'}}>
                        <td>Total</td>
                        <td style={{textAlign:'right'}}>S/ {totalPagado.toLocaleString()}</td>
                        <td style={{textAlign:'right'}}>S/ {totalDeuda.toLocaleString()}</td>
                        <td style={{textAlign:'right'}}>S/ {totalPagar.toLocaleString()}</td>
                      </tr>
                    );
                  })()
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        {/* Header del Dashboard */}
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h1>📊 Dashboard de Estadísticas</h1>
            <p>Resumen ejecutivo de pagos y deudas - Año Académico {añoActual}</p>
            <div className="año-selector">
              <label htmlFor="año-select">Año Académico:</label>
              <select 
                id="año-select" 
                value={añoActual} 
                onChange={(e) => cambiarAño(parseInt(e.target.value))}
                className="select-año"
              >
                {obtenerAñosParaSelect().map(año => (
                  <option key={año} value={año}>{año}</option>
                ))}
              </select>
              {/* Gestión de años solo en Archivos */}
            </div>
          </div>
          
          <div className="dashboard-time">
            <div className="current-time" style={{display:'flex',flexDirection:'column',gap:2}}>
              <div className="time-display" style={{marginBottom:0}}>{formatTime(currentTime)}</div>
              <div className="date-display" style={{marginBottom:4}}>{formatDate(currentTime)}</div>
              <div style={{textAlign:'right', color:'#1e40af', fontWeight:700}}>
                Bienvenido: {(
                  user?.nombreCompleto || `${(user?.nombres||'').trim()} ${(user?.apellidos||'').trim()}`.trim() || 'Usuario'
                )} <span style={{margin:'0 6px', color:'#64748b', fontWeight:400}}>|</span> Rol: {user?.rol || user?.role || user?.perfil?.nombre || 'Usuario'}
              </div>
            </div>
          </div>
        </div>

        {/* Título grande centrado con el año seleccionado */}
        <div style={{textAlign:'center', margin:'8px 0 20px'}}>
          <div style={{fontSize: isMobile ? 20 : 28, fontWeight: 800, letterSpacing: '0.5px', color:'#1e40af'}}>
            Año Académico {añoActual}
          </div>
          {fechaUltimaActualizacion && (
            <div style={{
              fontSize: isMobile ? 11 : 13, 
              color: '#64748b', 
              marginTop: 6,
              fontWeight: 500
            }}>
              Actualizado el {moment(fechaUltimaActualizacion).format('DD/MM/YYYY [a las] HH:mm')}
            </div>
          )}
          
          {/* Botón Estadísticas Generales - centrado y visible */}
          <div style={{marginTop:'16px'}}>
            <button 
              onClick={abrirModalGeneral}
              style={{
                background:'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color:'white',
                border:'none',
                borderRadius:'12px',
                padding:'12px 28px',
                fontWeight:700,
                fontSize:'14px',
                cursor:'pointer',
                boxShadow:'0 4px 14px rgba(245, 158, 11, 0.45)',
                transition:'all 0.3s ease',
                display:'inline-flex',
                alignItems:'center',
                gap:'8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 18px rgba(245, 158, 11, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 14px rgba(245, 158, 11, 0.45)';
              }}
            >
              <span style={{fontSize:'18px'}}>📊</span>
              <span>Estadísticas Generales</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de estadísticas principales */}
        <div className={`stats-grid ${isMobile ? 'grid-1' : isTablet ? 'grid-2' : 'grid-4'}`}>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{stats?.resumen?.totalAlumnos || '0'}</div>
              <div className="stat-label">Total Alumnos</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🧾</div>
            <div className="stat-content">
              <div className="stat-number">S/ {stats?.resumen?.totalDeudas?.toLocaleString() || '0'}</div>
              <div className="stat-label">Total Deuda</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-number">S/ {stats?.resumen?.totalIngresos?.toLocaleString() || '0'}</div>
              <div className="stat-label">Total Ingresos</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-number">S/ {stats?.resumen?.totalPendiente?.toLocaleString() || '0'}</div>
              <div className="stat-label">Deudas Pendientes</div>
            </div>
          </div>
        </div>

        {/* Estadísticas por Matrícula y Meses - PRIORIDAD */}
        <div className="meses-section" style={{marginBottom:'32px'}}>
          <h2>📅 Estadísticas por Matrícula y Meses</h2>
          <div className="ranking-card">
            <div className="ranking-header" style={{borderBottom:'1px solid var(--border-color)'}}>
              <h3 style={{margin:0}}>Estadísticas por Mes</h3>
              <div className="ranking-actions">
                <button className="export-btn" onClick={exportarMesesExcel} disabled={mesesLoading || !mesesData.length}>Excel</button>
                <button className="export-btn" onClick={exportarMesesPDF} disabled={mesesLoading || !mesesData.length}>PDF</button>
              </div>
            </div>
            {mesesLoading ? <div style={{padding:'0.75rem'}}>Cargando...</div> : (
              <table className="table">
                <thead><tr><th>Concepto</th><th style={{textAlign:'right'}}>Deuda Total</th><th style={{textAlign:'right'}}>Pagado</th><th style={{textAlign:'right'}}>Saldo a Pagar</th></tr></thead>
                <tbody>
                  <tr 
                    onClick={() => abrirModalMes('Matrícula', 0)} 
                    style={{cursor:'pointer'}}
                    className="clickable-row"
                  >
                    <td>Matrícula</td>
                    <td style={{textAlign:'right'}}>S/ {(matriculaData.deuda||0).toLocaleString()}</td>
                    <td style={{textAlign:'right'}}>S/ {(matriculaData.pagado||0).toLocaleString()}</td>
                    <td style={{textAlign:'right'}}>S/ {Math.max(Number(matriculaData.deuda||0)-Number(matriculaData.pagado||0),0).toLocaleString()}</td>
                  </tr>
                  {mesesData.map(m => (
                    <tr 
                      key={m.mes}
                      onClick={() => abrirModalMes(mesesNombres[m.mes-1], m.mes)}
                      style={{cursor:'pointer'}}
                      className="clickable-row"
                    >
                      <td>{mesesNombres[m.mes-1]}</td>
                      <td style={{textAlign:'right'}}>S/ {(m.deuda||0).toLocaleString()}</td>
                      <td style={{textAlign:'right'}}>S/ {(m.pagado||0).toLocaleString()}</td>
                      <td style={{textAlign:'right'}}>S/ {Math.max(Number(m.deuda||0)-Number(m.pagado||0),0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!mesesData.length && (
                    <tr><td colSpan={4} style={{textAlign:'center',padding:'0.75rem'}}>Sin datos para el año seleccionado. Aún no hay estadísticas por mes.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Gráficos detallados de meses */}
          <div className={`charts-grid ${isMobile ? 'grid-1' : 'grid-2'}`} style={{marginTop:'24px'}}>
            {/* Gráfico de barras: Pagado vs Deuda por mes */}
            <div className="chart-container">
              <div className="chart-title">Pagado vs Deuda por Mes</div>
              <div className="chart-wrapper">
                <Bar 
                  data={{
                    labels: ['Matrícula', ...mesesData.map(m => mesesNombres[m.mes-1])],
                    datasets: [
                      {
                        label: 'Pagado',
                        data: [matriculaData.pagado||0, ...mesesData.map(m => m.pagado||0)],
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 2
                      },
                      {
                        label: 'Deuda',
                        data: [matriculaData.deuda||0, ...mesesData.map(m => m.deuda||0)],
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 2
                      }
                    ]
                  }}
                  options={chartOptions}
                />
              </div>
            </div>

            {/* Gráfico de líneas: Evolución del saldo */}
            <div className="chart-container">
              <div className="chart-title">Evolución del Saldo Pendiente</div>
              <div className="chart-wrapper">
                <Bar 
                  data={{
                    labels: ['Matrícula', ...mesesData.map(m => mesesNombres[m.mes-1])],
                    datasets: [
                      {
                        label: 'Saldo a Pagar',
                        data: [
                          Math.max(Number(matriculaData.deuda||0)-Number(matriculaData.pagado||0),0),
                          ...mesesData.map(m => Math.max(Number(m.deuda||0)-Number(m.pagado||0),0))
                        ],
                        backgroundColor: 'rgba(245, 158, 11, 0.8)',
                        borderColor: 'rgba(245, 158, 11, 1)',
                        borderWidth: 2
                      }
                    ]
                  }}
                  options={chartOptions}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas por grado */}
        <div className="grados-section">
          <h2>📚 Estadísticas por Grado</h2>
          <div className={`grados-grid ${isMobile ? 'grid-1' : isTablet ? 'grid-2' : 'grid-3'}`}>
            {stats?.estadisticasPorGrado
              ?.filter((g) => (g.totalAlumnos || 0) > 0)
              .map((grado) => (
              <div key={grado.id} className="grado-card" onClick={() => abrirModalGrado(grado)} style={{cursor:'pointer'}}>
                <div className="grado-header">
                  <h3>{(grado.nombre || '').replace(/\s*[-–—]\s*20\d{2}\s*$/i, '')}</h3>
                  <span className="grado-nivel">{
                    (() => {
                      const name = (grado.nombre || '').toLowerCase();
                      if (name.includes('secundaria')) return 'Secundaria';
                      if (name.includes('inicial')) return 'Inicial';
                      return grado.nivel || 'Primaria';
                    })()
                  }</span>
                </div>
                <div className="grado-stats">
                  <div className="grado-stat"><span className="grado-stat-label">Alumnos:</span><span className="grado-stat-value">{grado.totalAlumnos}</span></div>
                  <div className="grado-stat"><span className="grado-stat-label">Total Deuda:</span><span className="grado-stat-value">S/ {(grado.totalDeudas||0).toLocaleString()}</span></div>
                  <div className="grado-stat"><span className="grado-stat-label">Ingresos:</span><span className="grado-stat-value">S/ {(grado.totalIngresos||0).toLocaleString()}</span></div>
                  <div className="grado-stat"><span className="grado-stat-label">Deuda Pendiente:</span><span className="grado-stat-value">S/ {Math.max((Number(grado.totalDeudas||0) - Number(grado.totalIngresos||0)),0).toLocaleString()}</span></div>
                </div>
                <div className="grado-progress">
                  {(() => {
                    const totalDeuda = Number(grado.totalDeudas||0);
                    const ingresos = Number(grado.totalIngresos||0);
                    const paidPct = totalDeuda>0 ? Math.min(Math.max((ingresos/totalDeuda)*100,0),100) : 0;
                    const debtPct = 100 - paidPct;
                    return (
                      <>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${paidPct}%` }} />
                        </div>
                        <span className="progress-text">
                          {Math.round(paidPct)}% Pagado - {Math.round(debtPct)}% Deuda Pendiente
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking de Deudores */}
        <div className="ranking-section">
          <h2>🏆 Ranking de Deudores</h2>
          <div className="ranking-grid">
            <div className="ranking-card">
              <div className="ranking-header">
                <h3>Top Alumnos</h3>
                <div className="ranking-actions">
                  <button className="export-btn" onClick={()=>exportarRankingExcel('alumnos')} disabled={rankingLoading || !ranking.topAlumnos.length}>Excel</button>
                  <button className="export-btn" onClick={()=>exportarRankingPDF('alumnos')} disabled={rankingLoading || !ranking.topAlumnos.length}>PDF</button>
                </div>
              </div>
              {rankingLoading ? <div style={{padding:'0.5rem'}}>Cargando...</div> : (
                <table className="table">
                  <thead><tr><th>DNI</th><th>Alumno</th><th>Grado</th><th style={{textAlign:'right'}}>Deuda Total</th></tr></thead>
                  <tbody>
                    {ranking.topAlumnos.slice(0,10).map(a => (
                      <tr key={a.alumno_id} onClick={() => handleClickAlumno(a)}>
                        <td>{a.dni}</td>
                        <td>{a.nombre}</td>
                        <td>{a.grado}</td>
                        <td style={{textAlign:'right'}}>S/ {(a.deuda_pendiente||0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!ranking.topAlumnos.length && <tr><td colSpan={4} style={{textAlign:'center',padding:'0.75rem'}}>Sin datos para el año seleccionado. Aún no hay deudores registrados.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
            <div className="ranking-card">
              <div className="ranking-header">
                <h3>Top Grados</h3>
                <div className="ranking-actions">
                  <button className="export-btn" onClick={()=>exportarRankingExcel('grados')} disabled={rankingLoading || !ranking.topGrados.length}>Excel</button>
                  <button className="export-btn" onClick={()=>exportarRankingPDF('grados')} disabled={rankingLoading || !ranking.topGrados.length}>PDF</button>
                </div>
              </div>
              {rankingLoading ? <div style={{padding:'0.5rem'}}>Cargando...</div> : (
                <table className="table">
                  <thead><tr><th>Grado</th><th style={{textAlign:'right'}}>Deuda Total</th><th style={{textAlign:'right'}}>Pagado</th><th style={{textAlign:'right'}}>Saldo a Pagar</th></tr></thead>
                  <tbody>
                    {ranking.topGrados.map(g => (
                      <tr key={g.grado_id} onClick={() => handleClickGrado(g)} style={{cursor:'pointer'}}>
                        <td>{g.grado}</td>
                        <td style={{textAlign:'right'}}>S/ {(g.deuda_total||0).toLocaleString()}</td>
                        <td style={{textAlign:'right'}}>S/ {(g.total_pagado||0).toLocaleString()}</td>
                        <td style={{textAlign:'right'}}>S/ {(g.deuda_pendiente||0).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!ranking.topGrados.length && <tr><td colSpan={4} style={{textAlign:'center',padding:'0.75rem'}}>Sin datos para el año seleccionado. Aún no hay deudas por grado.</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        
        {/* Modal alumnos por grado */}
        {modalOpen && (
          <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Alumnos - {(gradoSeleccionado?.nombre || '').replace(/\s*[-–—]\s*20\d{2}\s*$/i, '')} ({añoActual})</h3>
                <button className="close-btn" onClick={() => setModalOpen(false)}>✖</button>
              </div>
              <div className="modal-actions" style={{gap:'12px',justifyContent:'space-between'}}>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontSize:12,color:'var(--text-secondary)'}}>Filtro:</span>
                  <select className="filter-select" value={filtroAlumnos} onChange={(e)=>setFiltroAlumnos(e.target.value)}>
                    <option value="todos">Todos</option>
                    <option value="deudores">Solo Deudores</option>
                    <option value="pagadores">Solo Pagadores</option>
                  </select>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="export-btn" onClick={exportarExcel} disabled={modalLoading || !alumnosFiltrados?.length}>Exportar Excel</button>
                  <button className="export-btn" onClick={exportarPDF} disabled={modalLoading || !alumnosFiltrados?.length}>Exportar PDF</button>
                </div>
              </div>
              <div className="modal-body">
                {modalLoading ? (
                  <div style={{padding:'1rem'}}>Cargando alumnos...</div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>DNI</th>
                          <th>Alumno</th>
                          <th style={{textAlign:'right'}}>Pagado</th>
                          <th style={{textAlign:'right'}}>Deuda Total</th>
                          <th style={{textAlign:'right'}}>Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alumnosFiltrados?.map((a) => {
                          const saldo = Math.max(Number(a.deuda_total || 0) - Number(a.total_pagado || 0), 0);
                          return (
                            <tr key={a.id}>
                              <td>{a.dni}</td>
                              <td>{a.apellidos} {a.nombres}</td>
                              <td style={{textAlign:'right'}}>S/ {(a.total_pagado || 0).toLocaleString()}</td>
                              <td style={{textAlign:'right'}}>S/ {(a.deuda_total || 0).toLocaleString()}</td>
                              <td style={{textAlign:'right'}}>S/ {saldo.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                        {(!alumnosFiltrados || alumnosFiltrados.length===0) && (
                          <tr><td colSpan={5} style={{padding:'1rem', textAlign:'center'}}>Sin alumnos</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {!modalLoading && (
                <div className="modal-footer">
                  <div className="footer-item"><strong>Alumnos:</strong> {totalFiltrados}</div>
                  <div className="footer-item"><strong>Total Pagado:</strong> S/ {sumaPagado.toLocaleString()}</div>
                  <div className="footer-item"><strong>Deuda Total:</strong> S/ {sumaDeuda.toLocaleString()}</div>
                  <div className="footer-item"><strong>Saldo:</strong> S/ {sumaSaldo.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Saldo por Grado (para meses) */}
        {modalMesOpen && (
          <div className="modal-backdrop" onClick={() => setModalMesOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth:'900px'}}>
              <div className="modal-header">
                <h3>Saldo Pendiente por Aula - {mesSeleccionado?.nombre} ({añoActual})</h3>
                <button className="close-btn" onClick={() => setModalMesOpen(false)}>✖</button>
              </div>
              <div className="modal-body" style={{minHeight:'400px'}}>
                {modalMesLoading ? (
                  <div style={{padding:'2rem',textAlign:'center'}}>Cargando datos...</div>
                ) : saldosPorGrado.length === 0 ? (
                  <div style={{padding:'2rem',textAlign:'center',color:'var(--text-secondary)'}}>
                    No hay saldos pendientes para este concepto
                  </div>
                ) : (
                  <div style={{padding:'1rem'}}>
                    <div className="chart-wrapper" style={{height:'400px'}}>
                      <Bar 
                        data={{
                          labels: saldosPorGrado.map(g => {
                            // Acortar nombre del grado para mejor visualización
                            const nombre = g.grado || '';
                            return nombre.length > 25 ? nombre.substring(0, 25) + '...' : nombre;
                          }),
                          datasets: [{
                            label: 'Saldo Pendiente',
                            data: saldosPorGrado.map(g => Number(g.saldo || 0)),
                            backgroundColor: 'rgba(245, 158, 11, 0.8)',
                            borderColor: 'rgba(245, 158, 11, 1)',
                            borderWidth: 2
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false
                            },
                            title: {
                              display: true,
                              text: `Saldo Pendiente por Aula - ${mesSeleccionado?.nombre}`,
                              font: { size: 16, weight: 'bold' }
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const idx = context.dataIndex;
                                  const g = saldosPorGrado[idx];
                                  return [
                                    `Saldo: S/ ${Number(g.saldo || 0).toLocaleString()}`,
                                    `Deuda: S/ ${Number(g.deuda || 0).toLocaleString()}`,
                                    `Pagado: S/ ${Number(g.pagado || 0).toLocaleString()}`
                                  ];
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                callback: (value) => 'S/ ' + value.toLocaleString()
                              }
                            },
                            x: {
                              ticks: {
                                autoSkip: false,
                                maxRotation: 45,
                                minRotation: 45
                              }
                            }
                          }
                        }}
                      />
                    </div>
                    {/* Tabla resumen debajo del gráfico */}
                    <div style={{marginTop:'24px',maxHeight:'300px',overflowY:'auto'}}>
                      <table className="table" style={{fontSize:'0.9rem'}}>
                        <thead style={{position:'sticky',top:0,zIndex:10,background:'rgba(25,118,210,0.12)'}}>
                          <tr>
                            <th style={{background:'rgba(25,118,210,0.12)'}}>Aula</th>
                            <th style={{textAlign:'right',background:'rgba(25,118,210,0.12)'}}>Deuda</th>
                            <th style={{textAlign:'right',background:'rgba(25,118,210,0.12)'}}>Pagado</th>
                            <th style={{textAlign:'right',background:'rgba(25,118,210,0.12)'}}>Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {saldosPorGrado.map((g, idx) => (
                            <tr 
                              key={idx}
                              onClick={() => abrirModalAlumnos(g)}
                              style={{cursor:'pointer'}}
                              className="clickable-row"
                            >
                              <td>{g.grado}</td>
                              <td style={{textAlign:'right'}}>S/ {Number(g.deuda || 0).toLocaleString()}</td>
                              <td style={{textAlign:'right'}}>S/ {Number(g.pagado || 0).toLocaleString()}</td>
                              <td style={{textAlign:'right',fontWeight:'600',color:'var(--warning-color)'}}>
                                S/ {Number(g.saldo || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{fontWeight:'700',background:'#f8fafc'}}>
                            <td>Total</td>
                            <td style={{textAlign:'right'}}>
                              S/ {saldosPorGrado.reduce((acc, g) => acc + Number(g.deuda || 0), 0).toLocaleString()}
                            </td>
                            <td style={{textAlign:'right'}}>
                              S/ {saldosPorGrado.reduce((acc, g) => acc + Number(g.pagado || 0), 0).toLocaleString()}
                            </td>
                            <td style={{textAlign:'right',color:'var(--warning-color)'}}>
                              S/ {saldosPorGrado.reduce((acc, g) => acc + Number(g.saldo || 0), 0).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal 3: Alumnos Deudores por Aula y Mes */}
        {modalAlumnosOpen && (
          <div className="modal-backdrop" onClick={() => setModalAlumnosOpen(false)} style={{zIndex:1100}}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth:'800px',zIndex:1101}}>
              <div className="modal-header">
                <h3>Alumnos Deudores - {aulaSeleccionada?.grado} - {mesSeleccionado?.nombre}</h3>
                <button className="close-btn" onClick={() => setModalAlumnosOpen(false)}>✖</button>
              </div>
              <div className="modal-body" style={{minHeight:'200px'}}>
                {modalAlumnosLoading ? (
                  <div style={{padding:'2rem',textAlign:'center'}}>Cargando alumnos...</div>
                ) : alumnosDeudoresMes.length === 0 ? (
                  <div style={{padding:'2rem',textAlign:'center',color:'var(--text-secondary)'}}>
                    No hay alumnos deudores en esta aula para este concepto
                  </div>
                ) : (
                  <div style={{maxHeight:'500px',overflowY:'auto'}}>
                    <table className="table" style={{fontSize:'0.9rem'}}>
                      <thead style={{position:'sticky',top:0,zIndex:10,background:'rgba(25,118,210,0.12)'}}>
                        <tr>
                          <th style={{background:'rgba(25,118,210,0.12)'}}>DNI</th>
                          <th style={{background:'rgba(25,118,210,0.12)'}}>Alumno</th>
                          <th style={{textAlign:'right',background:'rgba(25,118,210,0.12)'}}>Deuda Total</th>
                          <th style={{textAlign:'right',background:'rgba(25,118,210,0.12)'}}>Pagado</th>
                          <th style={{textAlign:'right',background:'rgba(25,118,210,0.12)'}}>Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alumnosDeudoresMes.map((alumno, idx) => (
                          <tr key={idx}>
                            <td>{alumno.dni}</td>
                            <td>{alumno.nombre}</td>
                            <td style={{textAlign:'right'}}>S/ {Number(alumno.deuda_total || 0).toLocaleString()}</td>
                            <td style={{textAlign:'right'}}>S/ {Number(alumno.pagado || 0).toLocaleString()}</td>
                            <td style={{textAlign:'right',fontWeight:'600',color:'var(--danger-color)'}}>
                              S/ {Number(alumno.saldo || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot style={{position:'sticky',bottom:0,background:'#f8fafc'}}>
                        <tr style={{fontWeight:'700',background:'#f8fafc'}}>
                          <td colSpan={2}>Total ({alumnosDeudoresMes.length} alumnos)</td>
                          <td style={{textAlign:'right'}}>
                            S/ {alumnosDeudoresMes.reduce((acc, a) => acc + Number(a.deuda_total || 0), 0).toLocaleString()}
                          </td>
                          <td style={{textAlign:'right'}}>
                            S/ {alumnosDeudoresMes.reduce((acc, a) => acc + Number(a.pagado || 0), 0).toLocaleString()}
                          </td>
                          <td style={{textAlign:'right',color:'var(--danger-color)'}}>
                            S/ {alumnosDeudoresMes.reduce((acc, a) => acc + Number(a.saldo || 0), 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Estadísticas Generales (todos los años) */}
        {modalGeneralOpen && (
          <div className="modal-backdrop" onClick={() => setModalGeneralOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth:'1000px'}}>
              <div className="modal-header">
                <h3>📊 Estadísticas Generales - Comparativo por Años Académicos</h3>
                <button className="close-btn" onClick={() => setModalGeneralOpen(false)}>✖</button>
              </div>
              <div className="modal-body" style={{minHeight:'500px'}}>
                {modalGeneralLoading ? (
                  <div style={{padding:'2rem',textAlign:'center'}}>Cargando estadísticas...</div>
                ) : estadisticasGenerales.length === 0 ? (
                  <div style={{padding:'2rem',textAlign:'center',color:'var(--text-secondary)'}}>
                    No hay datos de años académicos disponibles
                  </div>
                ) : (
                  <div style={{padding:'1rem'}}>
                    {/* Tabla de estadísticas por año */}
                    <div style={{marginBottom:'32px'}}>
                      <h4 style={{marginBottom:'16px',color:'var(--text-primary)'}}>Resumen por Año Académico</h4>
                      <table className="table">
                        <thead style={{background:'rgba(25,118,210,0.12)'}}>
                          <tr>
                            <th style={{textAlign:'center'}}>Año</th>
                            <th style={{textAlign:'right'}}>Deuda Total</th>
                            <th style={{textAlign:'right'}}>Total Pagado</th>
                            <th style={{textAlign:'right'}}>Saldo Pendiente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {estadisticasGenerales.map((año) => (
                            <tr key={año.año}>
                              <td style={{textAlign:'center',fontWeight:'700',fontSize:'1.1rem',color:'var(--primary-color)'}}>
                                {año.año}
                              </td>
                              <td style={{textAlign:'right'}}>S/ {Number(año.deuda_total || 0).toLocaleString()}</td>
                              <td style={{textAlign:'right'}}>S/ {Number(año.total_pagado || 0).toLocaleString()}</td>
                              <td style={{textAlign:'right',fontWeight:'600',color:'var(--warning-color)'}}>
                                S/ {Number(año.saldo_pendiente || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Gráfico de barras comparativo */}
                    <div>
                      <h4 style={{marginBottom:'16px',color:'var(--text-primary)'}}>Comparativo Visual</h4>
                      <div className="chart-wrapper" style={{height:'450px'}}>
                        <Bar 
                          data={{
                            labels: estadisticasGenerales.map(a => String(a.año)),
                            datasets: [
                              {
                                label: 'Deuda Total',
                                data: estadisticasGenerales.map(a => Number(a.deuda_total || 0)),
                                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                                borderColor: 'rgba(239, 68, 68, 1)',
                                borderWidth: 2
                              },
                              {
                                label: 'Total Pagado',
                                data: estadisticasGenerales.map(a => Number(a.total_pagado || 0)),
                                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                                borderColor: 'rgba(16, 185, 129, 1)',
                                borderWidth: 2
                              },
                              {
                                label: 'Saldo Pendiente',
                                data: estadisticasGenerales.map(a => Number(a.saldo_pendiente || 0)),
                                backgroundColor: 'rgba(245, 158, 11, 0.7)',
                                borderColor: 'rgba(245, 158, 11, 1)',
                                borderWidth: 2
                              }
                            ]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top',
                                labels: {
                                  font: { size: 13, weight: '600' }
                                }
                              },
                              tooltip: {
                                callbacks: {
                                  label: (context) => {
                                    return context.dataset.label + ': S/ ' + context.parsed.y.toLocaleString();
                                  }
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  callback: (value) => 'S/ ' + value.toLocaleString()
                                }
                              },
                              x: {
                                ticks: {
                                  font: { size: 14, weight: '700' }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
