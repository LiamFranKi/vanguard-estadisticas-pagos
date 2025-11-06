import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AñoContext = createContext();

export const useAño = () => {
  const context = useContext(AñoContext);
  if (!context) {
    throw new Error('useAño debe usarse dentro de AñoProvider');
  }
  return context;
};

export const AñoProvider = ({ children }) => {
  const [añoActual, setAñoActual] = useState(new Date().getFullYear());
  const [añosDisponibles, setAñosDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarAñosDisponibles();
  }, []);

  const cargarAñosDisponibles = async () => {
    try {
      // Obtener años creados manualmente (activos)
      const response = await axios.get('/api/anios');
      const rows = response.data?.data || [];
      const años = rows.map(r => r.año).sort((a,b)=>b-a);
      setAñosDisponibles(años);
      // Si el año actual no está en la lista, no lo forzamos; el usuario agregará uno manualmente
      if (años.length > 0 && !años.includes(añoActual)) {
        setAñoActual(años[0]);
      }
    } catch (error) {
      console.error('Error cargando años:', error);
      setAñosDisponibles([]);
    } finally {
      setLoading(false);
    }
  };

  const cambiarAño = (nuevoAño) => {
    // Solo permitir años creados manualmente
    if (añosDisponibles.includes(nuevoAño)) {
      setAñoActual(nuevoAño);
    }
  };

  const obtenerAñosParaSelect = () => {
    // Mostrar únicamente los años creados manualmente
    return añosDisponibles;
  };

  const crearAño = async (nuevoAño, extra = {}) => {
    const añoInt = parseInt(nuevoAño);
    await axios.post('/api/anios', { año: añoInt, ...extra });
    await cargarAñosDisponibles();
    setAñoActual(añoInt);
  };

  const eliminarAño = async (año) => {
    const añoInt = parseInt(año);
    await axios.delete(`/api/anios/${añoInt}`);
    await cargarAñosDisponibles();
    // Si el año eliminado era el actual, mover al más reciente disponible
    setAñoActual(prev => (prev === añoInt ? (añosDisponibles[0] || new Date().getFullYear()) : prev));
  };

  const value = {
    añoActual,
    añosDisponibles,
    cambiarAño,
    obtenerAñosParaSelect,
    crearAño,
    eliminarAño,
    loading
  };

  return (
    <AñoContext.Provider value={value}>
      {children}
    </AñoContext.Provider>
  );
};

export default AñoContext;











