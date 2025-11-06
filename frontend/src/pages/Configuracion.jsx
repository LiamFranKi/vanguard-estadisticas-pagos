import React, { useState, useEffect } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import axios from 'axios';
import Swal from 'sweetalert2';

const Configuracion = () => {
  const { config, fetchConfig } = useConfig();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre_sistema: '',
    descripcion_sistema: '',
    logo: '',
    color_primario: '#2563eb',
    color_secundario: '#1e40af',
    email_sistema: '',
    telefono_sistema: '',
    direccion_sistema: ''
  });

  useEffect(() => {
    if (config) {
      setFormData({
        nombre_sistema: config.nombre_sistema || '',
        descripcion_sistema: config.descripcion_sistema || '',
        logo: config.logo || '',
        color_primario: config.color_primario || '#2563eb',
        color_secundario: config.color_secundario || '#1e40af',
        email_sistema: config.email_sistema || '',
        telefono_sistema: config.telefono_sistema || '',
        direccion_sistema: config.direccion_sistema || ''
      });
    }
  }, [config]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await axios.put('/api/config', formData);
      await fetchConfig();
      
      Swal.fire({
        icon: 'success',
        title: 'Configuración Guardada',
        text: 'Los cambios se aplicaron correctamente. Recarga la página para ver todos los cambios.',
        confirmButtonText: 'Recargar Página',
        showCancelButton: true,
        cancelButtonText: 'Cerrar'
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.reload();
        }
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'No se pudo guardar la configuración'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>⚙️</span> Configuración del Sistema
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Personaliza el nombre, colores, logo y datos de contacto del sistema
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '24px' }}>
          
          {/* Sección: Información General */}
          <div style={{ 
            background: 'white', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--border-radius)', 
            padding: '24px',
            boxShadow: 'var(--shadow)'
          }}>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 Información General
            </h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Nombre del Sistema</label>
                <input
                  type="text"
                  name="nombre_sistema"
                  value={formData.nombre_sistema}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ej: Vanguard Estadísticas Pagos"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  name="descripcion_sistema"
                  value={formData.descripcion_sistema}
                  onChange={handleChange}
                  className="form-input"
                  rows="3"
                  placeholder="Breve descripción del sistema..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Logo (URL)</label>
                <input
                  type="url"
                  name="logo"
                  value={formData.logo}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="https://ejemplo.com/logo.png"
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  URL de la imagen del logo (opcional)
                </small>
              </div>
            </div>
          </div>

          {/* Sección: Colores del Sistema */}
          <div style={{ 
            background: 'white', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--border-radius)', 
            padding: '24px',
            boxShadow: 'var(--shadow)'
          }}>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🎨 Colores del Sistema
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="form-group">
                <label className="form-label">Color Primario</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="color"
                    name="color_primario"
                    value={formData.color_primario}
                    onChange={handleChange}
                    style={{ 
                      width: '80px', 
                      height: '45px', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={formData.color_primario}
                    onChange={(e) => setFormData(prev => ({ ...prev, color_primario: e.target.value }))}
                    className="form-input"
                    placeholder="#2563eb"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    style={{ flex: 1 }}
                  />
                  <div style={{ 
                    width: '80px', 
                    height: '45px', 
                    background: formData.color_primario,
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }} />
                </div>
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Usado en botones, encabezados y elementos principales
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Color Secundario</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="color"
                    name="color_secundario"
                    value={formData.color_secundario}
                    onChange={handleChange}
                    style={{ 
                      width: '80px', 
                      height: '45px', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={formData.color_secundario}
                    onChange={(e) => setFormData(prev => ({ ...prev, color_secundario: e.target.value }))}
                    className="form-input"
                    placeholder="#1e40af"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    style={{ flex: 1 }}
                  />
                  <div style={{ 
                    width: '80px', 
                    height: '45px', 
                    background: formData.color_secundario,
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }} />
                </div>
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Usado en gradientes y elementos complementarios
                </small>
              </div>
            </div>

            {/* Preview de colores */}
            <div style={{ 
              marginTop: '24px', 
              padding: '20px', 
              background: `linear-gradient(135deg, ${formData.color_primario} 0%, ${formData.color_secundario} 100%)`,
              borderRadius: '12px',
              color: 'white',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Vista Previa del Gradiente</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
                Así se verán los encabezados y fondos con estos colores
              </p>
            </div>
          </div>

          {/* Sección: Datos de Contacto */}
          <div style={{ 
            background: 'white', 
            border: '1px solid var(--border-color)', 
            borderRadius: 'var(--border-radius)', 
            padding: '24px',
            boxShadow: 'var(--shadow)'
          }}>
            <h2 style={{ marginBottom: '20px', fontSize: '1.3rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📞 Datos de Contacto
            </h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Email de Contacto</label>
                <input
                  type="email"
                  name="email_sistema"
                  value={formData.email_sistema}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="contacto@vanguard.edu.pe"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input
                  type="text"
                  name="telefono_sistema"
                  value={formData.telefono_sistema}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="(01) 234-5678"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dirección</label>
                <textarea
                  name="direccion_sistema"
                  value={formData.direccion_sistema}
                  onChange={handleChange}
                  className="form-input"
                  rows="2"
                  placeholder="Dirección del colegio..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Botón Guardar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ padding: '12px 32px', fontSize: '1rem' }}
            >
              {loading ? 'Guardando...' : '💾 Guardar Configuración'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Configuracion;
