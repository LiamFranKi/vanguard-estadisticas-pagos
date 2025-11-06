import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import './Landing.css';

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const { config } = useConfig();

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="hero-icon" aria-hidden>
              {/* System-owned SVG icon (colorful animated bars) */}
              <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4f46e5"/>
                    <stop offset="33%" stopColor="#7c3aed"/>
                    <stop offset="66%" stopColor="#06b6d4"/>
                    <stop offset="100%" stopColor="#22c55e"/>
                  </linearGradient>
                  <linearGradient id="bars1" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#60a5fa"/>
                    <stop offset="100%" stopColor="#2563eb"/>
                  </linearGradient>
                  <linearGradient id="bars2" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#f472b6"/>
                    <stop offset="100%" stopColor="#db2777"/>
                  </linearGradient>
                  <linearGradient id="bars3" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#34d399"/>
                    <stop offset="100%" stopColor="#16a34a"/>
                  </linearGradient>
                </defs>
                <rect x="6" y="6" width="52" height="52" rx="12" fill="url(#grad)" opacity="0.22"/>
                <line x1="10" y1="52" x2="54" y2="52" stroke="#e2e8f0" strokeWidth="2" opacity="0.9"/>
                <rect className="bar bar1" x="14" y="30" width="10" height="20" rx="3" fill="url(#bars1)"/>
                <rect className="bar bar2" x="29" y="20" width="10" height="30" rx="3" fill="url(#bars2)"/>
                <rect className="bar bar3" x="44" y="12" width="10" height="38" rx="3" fill="url(#bars3)"/>
                <circle className="dot dot1" cx="20" cy="26" r="2.2" fill="#22d3ee"/>
                <circle className="dot dot2" cx="35" cy="18" r="2.2" fill="#22d3ee"/>
                <circle className="dot dot3" cx="50" cy="10" r="2.2" fill="#22d3ee"/>
              </svg>
            </div>
            <h1 className="hero-title">
              {config?.nombre_sistema || '📊 Vanguard Estadísticas Pagos'}
            </h1>
            <p className="hero-subtitle">
              {config?.descripcion_sistema || 'Sistema completo de gestión de pagos de pensiones escolares. Administra, visualiza y analiza las estadísticas de pagos de forma eficiente.'}
            </p>
            <div className="hero-buttons">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn-primary btn-large">
                  Ir al Dashboard
                </Link>
              ) : (
                <Link to="/login" className="btn btn-primary btn-large">
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Características Principales</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3 className="feature-title">Estadísticas en Tiempo Real</h3>
              <p className="feature-description">
                Visualiza gráficos interactivos y reportes detallados de pagos,
                morosidad y distribución por grados.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3 className="feature-title">Gestión de Pagos</h3>
              <p className="feature-description">
                Registra y gestiona pagos de pensiones de forma simple e intuitiva.
                Exporta reportes en Excel y PDF.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <h3 className="feature-title">Control de Deudas</h3>
              <p className="feature-description">
                Identifica y gestiona deudas pendientes con alertas automáticas
                y seguimiento detallado de cada alumno.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Múltiples Años Académicos</h3>
              <p className="feature-description">
                Gestiona varios años académicos simultáneamente y compara
                estadísticas entre diferentes períodos.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3 className="feature-title">Seguridad Total</h3>
              <p className="feature-description">
                Sistema seguro con autenticación JWT y control de acceso basado
                en roles de usuario.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3 className="feature-title">Responsive</h3>
              <p className="feature-description">
                Accede desde cualquier dispositivo con una interfaz completamente
                adaptable a móviles, tablets y escritorio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <h2 className="section-title">Números que Hablan</h2>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-number">100%</div>
              <div className="stat-label">Seguro y Confiable</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Disponible en Todo Momento</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">∞</div>
              <div className="stat-label">Años Académicos</div>
            </div>
            <div className="stat-box">
              <div className="stat-number">📊</div>
              <div className="stat-label">Reportes Ilimitados</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2 className="cta-title">¿Listo para empezar?</h2>
            <p className="cta-description">
              Comienza a gestionar las estadísticas de pagos de tu institución
              educativa de forma profesional y eficiente.
            </p>
            {!isAuthenticated && (
              <Link to="/login" className="btn btn-primary btn-large">
                Iniciar Sesión Ahora
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>
                {config?.logo ? (
                  <img src={config.logo} alt="Logo" style={{ width: 28, height: 28, verticalAlign: 'middle', marginRight: 8, borderRadius: '50%' }} />
                ) : (
                  '📊 '
                )}
                {config?.nombre_sistema || 'Vanguard Estadísticas Pagos'}
              </h3>
              <p>{config?.descripcion_sistema || 'Sistema de gestión de pagos de pensiones'}</p>
            </div>
            <div className="footer-links">
              <h4>Contacto</h4>
              <p>Email: {config?.email_sistema || 'info@vanguardschools.com'}</p>
              <p>Teléfono: {config?.telefono_sistema || '(01) 234-5678'}</p>
            </div>
            <div className="footer-info">
              <p>© {new Date().getFullYear()} Todos los derechos reservados</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

