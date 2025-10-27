import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { config } = useConfig();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Menú de navegación
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', mobileIcon: '📊' },
    { path: '/estadisticas', label: 'Estadísticas', icon: '📈', mobileIcon: '📈' },
    { path: '/archivos', label: 'Archivos', icon: '📁', mobileIcon: '📁' },
    { path: '/alumnos', label: 'Alumnos', icon: '👥', mobileIcon: '👥' },
    { path: '/reportes', label: 'Reportes', icon: '📋', mobileIcon: '📋' }
  ];

  // Menú de administrador
  const adminItems = [
    { path: '/configuracion', label: 'Configuración', icon: '⚙️', mobileIcon: '⚙️' }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-content">
        {/* Logo y marca */}
        <Link to="/dashboard" className="navbar-brand" onClick={closeMobileMenu}>
          <div className="navbar-logo">
            📊
          </div>
          <span className="navbar-brand-text">
            {config?.nombre_sistema || 'Vanguard Estadísticas'}
          </span>
        </Link>

        {/* Menú de navegación */}
        {!isMobile && (
          <ul className="navbar-nav">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`navbar-link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  {isTablet ? item.mobileIcon : item.label}
                </Link>
              </li>
            ))}
            
            {/* Menú de administrador */}
            {user?.rol === 'Administrador' && (
              <>
                {isTablet ? (
                  <li>
                    <Link
                      to="/configuracion"
                      className={`navbar-link ${location.pathname === '/configuracion' ? 'active' : ''}`}
                      title="Configuración"
                    >
                      ⚙️
                    </Link>
                  </li>
                ) : (
                  adminItems.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`navbar-link ${location.pathname === item.path ? 'active' : ''}`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))
                )}
              </>
            )}
          </ul>
        )}

        {/* Información del usuario */}
        <div className="navbar-user">
          {isMobile ? (
            <div className="navbar-user-mobile">
              <span className="navbar-user-name">
                {user?.nombres?.split(' ')[0] || 'Usuario'}
              </span>
              <button
                className="navbar-toggle"
                onClick={toggleMobileMenu}
                aria-label="Menú"
              >
                ☰
              </button>
            </div>
          ) : (
            <div className="navbar-user-info">
              <span className="navbar-user-name">
                {user?.nombres} {user?.apellidos}
              </span>
              <span className="navbar-user-role">
                {user?.rol}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleLogout}
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Menú móvil */}
      {isMobile && isMobileMenuOpen && (
        <div className="navbar-mobile-menu">
          <div className="navbar-mobile-content">
            {/* Enlaces de navegación */}
            <div className="navbar-mobile-section">
              <h3>Navegación</h3>
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`navbar-mobile-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span className="navbar-mobile-icon">{item.mobileIcon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Enlaces de administrador */}
            {user?.rol === 'Administrador' && (
              <div className="navbar-mobile-section">
                <h3>Administración</h3>
                {adminItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`navbar-mobile-link ${location.pathname === item.path ? 'active' : ''}`}
                    onClick={closeMobileMenu}
                  >
                    <span className="navbar-mobile-icon">{item.mobileIcon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Información del usuario */}
            <div className="navbar-mobile-section">
              <div className="navbar-mobile-user">
                <div className="navbar-mobile-user-info">
                  <h4>{user?.nombres} {user?.apellidos}</h4>
                  <p>{user?.rol}</p>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleLogout}
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
