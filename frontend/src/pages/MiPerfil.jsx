import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import Swal from 'sweetalert2';

const MiPerfil = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombres: user?.nombres || '',
    apellidos: user?.apellidos || '',
    dni: user?.dni || '',
    email: user?.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    claveActual: '',
    claveNueva: '',
    claveConfirmar: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSubmitDatos = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put('/api/usuarios/mi-perfil', formData);
      Swal.fire({
        icon: 'success',
        title: 'Perfil actualizado',
        text: 'Tus datos se han actualizado correctamente',
        timer: 2000
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo actualizar el perfil'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.claveNueva !== passwordData.claveConfirmar) {
      return Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Las contraseñas no coinciden'
      });
    }

    if (passwordData.claveNueva.length < 6) {
      return Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    try {
      setLoading(true);
      await axios.put('/api/usuarios/mi-password', {
        claveActual: passwordData.claveActual,
        claveNueva: passwordData.claveNueva
      });
      
      setPasswordData({ claveActual: '', claveNueva: '', claveConfirmar: '' });
      
      Swal.fire({
        icon: 'success',
        title: 'Contraseña actualizada',
        text: 'Tu contraseña se ha cambiado correctamente',
        timer: 2000
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo cambiar la contraseña'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>👤</span> Mi Perfil
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Administra tu información personal y contraseña
      </p>

      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Sección: Datos Personales */}
        <div style={{ 
          background: 'white', 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--border-radius)', 
          padding: '24px',
          boxShadow: 'var(--shadow)'
        }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.3rem', color: 'var(--text-primary)' }}>
            📝 Datos Personales
          </h2>
          <form onSubmit={handleSubmitDatos}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">DNI</label>
                <input
                  type="text"
                  name="dni"
                  value={formData.dni}
                  className="form-input"
                  disabled
                  style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  El DNI no se puede modificar
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Nombres</label>
                <input
                  type="text"
                  name="nombres"
                  value={formData.nombres}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Apellidos</label>
                <input
                  type="text"
                  name="apellidos"
                  value={formData.apellidos}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
                style={{ marginTop: '8px' }}
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>

        {/* Sección: Cambiar Contraseña */}
        <div style={{ 
          background: 'white', 
          border: '1px solid var(--border-color)', 
          borderRadius: 'var(--border-radius)', 
          padding: '24px',
          boxShadow: 'var(--shadow)'
        }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.3rem', color: 'var(--text-primary)' }}>
            🔐 Cambiar Contraseña
          </h2>
          <form onSubmit={handleSubmitPassword}>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Contraseña Actual</label>
                <input
                  type="password"
                  name="claveActual"
                  value={passwordData.claveActual}
                  onChange={handlePasswordChange}
                  className="form-input"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nueva Contraseña</label>
                <input
                  type="password"
                  name="claveNueva"
                  value={passwordData.claveNueva}
                  onChange={handlePasswordChange}
                  className="form-input"
                  required
                  minLength="6"
                  autoComplete="new-password"
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Mínimo 6 caracteres
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  name="claveConfirmar"
                  value={passwordData.claveConfirmar}
                  onChange={handlePasswordChange}
                  className="form-input"
                  required
                  minLength="6"
                  autoComplete="new-password"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-warning" 
                disabled={loading}
                style={{ marginTop: '8px' }}
              >
                {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MiPerfil;

