import axios from 'axios';

const base = '/api/usuarios';

export const listarUsuarios = async ({ page = 1, limit = 10, q = '' } = {}) => {
  const { data } = await axios.get(base, { params: { page, limit, q } });
  return data?.data || data;
};

export const crearUsuario = async (payload) => {
  const { data } = await axios.post(base, payload);
  return data?.data || data;
};

export const actualizarUsuario = async (id, payload) => {
  const { data } = await axios.put(`${base}/${id}`, payload);
  return data?.data || data;
};

export const resetearPassword = async (id, nuevaClave) => {
  const { data } = await axios.patch(`${base}/${id}/reset-password`, { nuevaClave });
  return data;
};

export const alternarActivo = async (id) => {
  const { data } = await axios.patch(`${base}/${id}/toggle`);
  return data?.data || data;
};

export const eliminarUsuario = async (id) => {
  const { data } = await axios.delete(`${base}/${id}`);
  return data;
};
