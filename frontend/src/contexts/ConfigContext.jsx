import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const ConfigContext = createContext();

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig debe ser usado dentro de ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get('/api/config');
      const data = response.data?.data || response.data;
      setConfig(data);
      // Propagar colores a variables CSS globales
      if (data?.color_primario) {
        document.documentElement.style.setProperty('--primary-color', data.color_primario);
      }
      if (data?.color_secundario) {
        document.documentElement.style.setProperty('--secondary-color', data.color_secundario);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      // Configuración por defecto si falla
      setConfig({
        nombre_sistema: 'Vanguard Estadísticas Pagos',
        descripcion_sistema: 'Sistema de gestión de pagos de pensiones',
        logo: null,
        color_primario: '#1976d2',
        color_secundario: '#764ba2'
      });
      document.documentElement.style.setProperty('--primary-color', '#1976d2');
      document.documentElement.style.setProperty('--secondary-color', '#764ba2');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig) => {
    try {
      const response = await axios.put('/api/config', newConfig);
      const data = response.data?.data || response.data;
      setConfig(data);
      if (data?.color_primario) document.documentElement.style.setProperty('--primary-color', data.color_primario);
      if (data?.color_secundario) document.documentElement.style.setProperty('--secondary-color', data.color_secundario);
      return { success: true };
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al actualizar configuración' 
      };
    }
  };

  const value = {
    config,
    loading,
    fetchConfig,
    updateConfig
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};
