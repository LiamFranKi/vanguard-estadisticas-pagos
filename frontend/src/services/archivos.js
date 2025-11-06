import axios from 'axios';

export const listarArchivos = async ({ page = 1, limit = 10, tipo, año } = {}) => {
  const params = { page, limit };
  if (tipo) params.tipo = tipo;
  if (año) params.año = año;
  const { data } = await axios.get('/api/archivos', { params });
  return data;
};

export const subirArchivo = async ({ file, año, tipo, onProgress }) => {
  const form = new FormData();
  form.append('archivo', file);
  form.append('año', año);
  form.append('anio', año); // compatibilidad backend
  if (tipo) form.append('tipo', tipo);
  const { data } = await axios.post('/api/archivos/upload', form, {
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        const pct = Math.round((evt.loaded * 100) / evt.total);
        onProgress(pct);
      }
    },
  });
  return data;
};

export const eliminarArchivo = async (id) => {
  const { data } = await axios.delete(`/api/archivos/${id}`);
  return data;
};
