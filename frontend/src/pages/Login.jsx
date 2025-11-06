import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import Swal from 'sweetalert2';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    dni: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { login } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  // Detectar dispositivo móvil
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.dni || !formData.password) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos requeridos',
        text: 'Por favor completa todos los campos'
      });
      return;
    }

    setLoading(true);

    try {
      const result = await login(formData.dni, formData.password);
      
      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Bienvenido!',
          text: 'Has iniciado sesión correctamente',
          timer: 1500,
          showConfirmButton: false
        });
        
        navigate('/dashboard');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error de autenticación',
          text: result.message || 'Credenciales incorrectas'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error interno del servidor'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo y título */}
        <div className="login-header">
          <div className="login-logo">
            {config?.logo ? (
              <img src={config.logo} alt="Logo" />
            ) : (
              '📊'
            )}
          </div>
          <h1 className="login-title">
            {config?.nombre_sistema || 'Vanguard Estadísticas'}
          </h1>
          <p className="login-subtitle">
            {config?.descripcion_sistema || 'Sistema de gestión de pagos de pensiones'}
          </p>
        </div>

        {/* Formulario de login */}
        <div className="login-form-container">
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="dni" className="form-label">
                DNI
              </label>
              <input
                type="text"
                id="dni"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                className="form-input"
                 placeholder="Ingresa tu DNI"
                 maxLength="9"
                 disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="Ingresa tu contraseña"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-login ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
          <div className="back-link">
            <Link to="/">← Volver al inicio</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
