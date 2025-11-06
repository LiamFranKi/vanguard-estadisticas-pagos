import axios from 'axios';

export const getTopDeudores = async ({ año, limit = 10 }) => {
  const { data } = await axios.get('/api/estadisticas/deudores/top', {
    params: { año, limit }
  });
  return data;
};

export const getEstadisticasPorMes = async ({ año }) => {
  const { data } = await axios.get('/api/estadisticas/meses', {
    params: { año }
  });
  return data;
};

export const getDeudaAlumno = async ({ alumnoId, año }) => {
  const { data } = await axios.get(`/api/estadisticas/alumno/${alumnoId}/deuda`, {
    params: { año }
  });
  return data;
};

export const getDeudaGrado = async ({ gradoId, año }) => {
  const { data } = await axios.get(`/api/estadisticas/grado/${gradoId}/deuda`, {
    params: { año }
  });
  return data;
};
