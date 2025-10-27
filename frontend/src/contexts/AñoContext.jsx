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
      const response = await axios.get('/api/años/disponibles');
      const años = response.data.data;
      
      setAñosDisponibles(años);
      
      // Si no hay años disponibles o el año actual no está en la lista,
      // usar el año actual del sistema
      if (!años.includes(añoActual)) {
        setAñoActual(new Date().getFullYear());
      }
    } catch (error) {
      console.error('Error cargando años:', error);
      setAñosDisponibles([new Date().getFullYear()]);
    } finally {
      setLoading(false);
    }
  };

  const cambiarAño = (nuevoAño) => {
    if (añosDisponibles.includes(nuevoAño)) {
      setAñoActual(nuevoAño);
    }
  };

  const obtenerAñosParaSelect = () => {
    // Si no hay años con datos, retornar solo el año actual
    if (añosDisponibles.length === 0) {
      return [new Date().getFullYear()];
    }
    
    // Generar lista de años (actual y anteriores)
    const añoActual = new Date().getFullYear();
    const años = [];
    
    // Agregar año actual y años anteriores que tengan datos
    for (let año = añoActual; año >= 2020; año--) {
      if (añosDisponibles.includes(año)) {
        años.push(año);
      }
    }
    
    return años;
  };

  const value = {
    añoActual,
    añosDisponibles,
    cambiarAño,
    obtenerAñosParaSelect,
    loading
  };

  return (
    <AñoContext.Provider value={value}>
      {children}
    </AñoContext.Provider>
  );
};

export default AñoContext;

