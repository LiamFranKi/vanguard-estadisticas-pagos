import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import moment from 'moment';
import { useAño } from '../contexts/AñoContext';
import './Dashboard.css';

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const { añoActual, cambiarAño, obtenerAñosParaSelect } = useAño();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

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
      setStats(response.data);
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
            </div>
          </div>
          
          <div className="dashboard-time">
            <div className="current-time">
              <div className="time-display">{formatTime(currentTime)}</div>
              <div className="date-display">{formatDate(currentTime)}</div>
            </div>
          </div>
        </div>

        {/* Tarjetas de estadísticas principales */}
        <div className={`stats-grid ${isMobile ? 'grid-1' : isTablet ? 'grid-2' : 'grid-4'}`}>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-number">
                S/ {stats?.resumen?.totalIngresos?.toLocaleString() || '0'}
              </div>
              <div className="stat-label">Total Ingresos</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">
                {stats?.resumen?.totalAlumnos || '0'}
              </div>
              <div className="stat-label">Total Alumnos</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-number">
                {stats?.resumen?.totalPagos || '0'}
              </div>
              <div className="stat-label">Pagos Realizados</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-number">
                S/ {stats?.resumen?.totalDeudas?.toLocaleString() || '0'}
              </div>
              <div className="stat-label">Deudas Pendientes</div>
            </div>
          </div>
        </div>

        {/* Gráficos principales */}
        <div className={`charts-grid ${isMobile ? 'grid-1' : 'grid-2'}`}>
          {/* Gráfico de ingresos por mes */}
          <div className="chart-container">
            <div className="chart-title">Ingresos por Mes</div>
            <div className="chart-wrapper">
              <Bar data={ingresosData} options={chartOptions} />
            </div>
          </div>

          {/* Gráfico de comparación ingresos vs deudas */}
          <div className="chart-container">
            <div className="chart-title">Ingresos vs Deudas</div>
            <div className="chart-wrapper">
              <Doughnut data={comparacionData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Estadísticas por grado */}
        <div className="grados-section">
          <h2>📚 Estadísticas por Grado</h2>
          <div className={`grados-grid ${isMobile ? 'grid-1' : isTablet ? 'grid-2' : 'grid-3'}`}>
            {stats?.estadisticasPorGrado?.map((grado) => (
              <div key={grado.id} className="grado-card">
                <div className="grado-header">
                  <h3>{grado.nombre}</h3>
                  <span className="grado-nivel">{grado.nivel}</span>
                </div>
                <div className="grado-stats">
                  <div className="grado-stat">
                    <span className="grado-stat-label">Alumnos:</span>
                    <span className="grado-stat-value">{grado.totalAlumnos}</span>
                  </div>
                  <div className="grado-stat">
                    <span className="grado-stat-label">Ingresos:</span>
                    <span className="grado-stat-value">
                      S/ {grado.totalIngresos?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="grado-stat">
                    <span className="grado-stat-label">Deudas:</span>
                    <span className="grado-stat-value">
                      S/ {grado.totalDeudas?.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>
                <div className="grado-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${grado.totalAlumnos > 0 ? 
                          ((grado.totalAlumnos - (grado.alumnosConDeudas || 0)) / grado.totalAlumnos * 100) : 0}%` 
                      }}
                    />
                  </div>
                  <span className="progress-text">
                    {grado.totalAlumnos > 0 ? 
                      Math.round(((grado.totalAlumnos - (grado.alumnosConDeudas || 0)) / grado.totalAlumnos * 100)) : 0}% Pagado
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen de archivos procesados */}
        <div className="archivos-section">
          <h2>📁 Últimos Archivos Procesados</h2>
          <div className="archivos-list">
            {stats?.ultimosArchivos?.map((archivo) => (
              <div key={archivo.id} className="archivo-item">
                <div className="archivo-icon">
                  {archivo.tipo_archivo === 'excel' ? '📊' : '📄'}
                </div>
                <div className="archivo-info">
                  <div className="archivo-nombre">{archivo.nombre_archivo}</div>
                  <div className="archivo-meta">
                    <span className="archivo-tipo">{archivo.tipo_archivo.toUpperCase()}</span>
                    <span className="archivo-fecha">
                      {moment(archivo.created_at).format('DD/MM/YYYY HH:mm')}
                    </span>
                    <span className="archivo-registros">
                      {archivo.registros_procesados} registros
                    </span>
                  </div>
                </div>
                <div className="archivo-status">
                  {archivo.errores_procesamiento ? (
                    <span className="status-error">⚠️ Con errores</span>
                  ) : (
                    <span className="status-success">✅ Procesado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
