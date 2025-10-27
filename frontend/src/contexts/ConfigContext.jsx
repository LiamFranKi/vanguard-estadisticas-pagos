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
      setConfig(response.data);
    } catch (error) {
      console.error('Error cargando configuración:', error);
      // Configuración por defecto si falla
      setConfig({
        nombre_sistema: 'Vanguard Estadísticas Pagos',
        color_primario: '#1976d2',
        color_secundario: '#7c4dff'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig) => {
    try {
      const response = await axios.put('/api/config', newConfig);
      setConfig(response.data);
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
