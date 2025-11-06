import axios from 'axios';

export const listarAlumnosPorGrado = async ({ grado_id, año, page = 1, limit = 100 }) => {
  const { data } = await axios.get('/api/alumnos', {
    params: { grado_id, año, page, limit }
  });
  return data;
};
