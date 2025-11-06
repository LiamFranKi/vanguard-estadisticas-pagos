import React, { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  resetearPassword,
  alternarActivo,
  eliminarUsuario
} from '../services/usuarios';

const initialForm = {
  dni: '',
  nombres: '',
  apellidos: '',
  email: '',
  telefono: '',
  rol: 'Usuario',
  clave: ''
};

const Usuarios = () => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const roleBadgeStyle = (rol) => {
    const base = {
      padding: '4px 10px',
      borderRadius: 10,
      color: '#fff',
      fontWeight: 600,
      fontSize: '0.85rem',
      display: 'inline-block',
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
    };
    if (rol === 'Administrador') {
      return { ...base, background: 'linear-gradient(135deg, #f87171, #ef4444)' };
    }
    if (rol === 'Usuario' || rol === 'Docente') {
      return { ...base, background: 'linear-gradient(135deg, #60a5fa, #3b82f6)' };
    }
    return { ...base, background: 'linear-gradient(135deg, #cbd5e1, #94a3b8)' };
  };

  useEffect(() => { load(); }, [page, limit]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listarUsuarios({ page, limit, q: query });
      setItems(Array.isArray(data) ? data : data?.data || []);
      setTotal(data?.pagination?.total || data?.length || 0);
    } catch (e) {
      console.error('Error listando usuarios', e);
    } finally {
      setLoading(false);
    }
  };

  const onSearch = async (e) => {
    e.preventDefault();
    setPage(1);
    await load();
  };

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ ...initialForm, ...u, clave: '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await actualizarUsuario(editing.id, {
          nombres: form.nombres,
          apellidos: form.apellidos,
          email: form.email,
          telefono: form.telefono,
          rol: form.rol,
          activo: editing.activo
        });
      } else {
        await crearUsuario(form);
      }
      setShowModal(false);
      await load();
      await Swal.fire({ icon: 'success', title: 'Guardado', timer: 1200, showConfirmButton: false });
    } catch (e) {
      console.error('Error guardando usuario', e);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el usuario' });
    }
  };

  const handleReset = async (id) => {
    const r = await Swal.fire({
      icon: 'question',
      title: '¿Restablecer contraseña?',
      text: 'Se asignará una nueva contraseña al usuario.',
      showCancelButton: true,
      confirmButtonText: 'Sí, restablecer',
      cancelButtonText: 'Cancelar'
    });
    if (!r.isConfirmed) return;
    await resetearPassword(id);
    Swal.fire({ icon: 'success', title: 'Contraseña restablecida', timer: 1200, showConfirmButton: false });
  };

  const handleCambiarPassword = async (usuario) => {
    const { value: formValues } = await Swal.fire({
      title: `Cambiar contraseña - ${usuario.nombres} ${usuario.apellidos}`,
      html: `
        <div style="text-align:left;display:grid;gap:12px;padding:8px">
          <div>
            <label style="display:block;margin-bottom:4px;font-weight:600;color:#374151;font-size:14px">Nueva Contraseña</label>
            <input id="swal-password" type="password" class="swal2-input" placeholder="Ingrese nueva contraseña" style="width:100%;margin:0;padding:12px;font-size:14px">
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;font-weight:600;color:#374151;font-size:14px">Confirmar Contraseña</label>
            <input id="swal-confirm" type="password" class="swal2-input" placeholder="Confirme la contraseña" style="width:100%;margin:0;padding:12px;font-size:14px">
          </div>
          <small style="color:#6b7280;font-size:12px">La contraseña debe tener al menos 6 caracteres</small>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Cambiar Contraseña',
      cancelButtonText: 'Cancelar',
      width: '480px',
      preConfirm: () => {
        const password = document.getElementById('swal-password').value;
        const confirm = document.getElementById('swal-confirm').value;
        if (!password || !confirm) {
          Swal.showValidationMessage('Ambos campos son requeridos');
          return false;
        }
        if (password !== confirm) {
          Swal.showValidationMessage('Las contraseñas no coinciden');
          return false;
        }
        if (password.length < 6) {
          Swal.showValidationMessage('La contraseña debe tener al menos 6 caracteres');
          return false;
        }
        return { password };
      }
    });

    if (formValues) {
      try {
        await resetearPassword(usuario.id, formValues.password);
        Swal.fire({ 
          icon: 'success', 
          title: 'Contraseña actualizada', 
          text: 'La contraseña se ha cambiado correctamente',
          timer: 2000 
        });
      } catch (error) {
        Swal.fire({ 
          icon: 'error', 
          title: 'Error', 
          text: 'No se pudo cambiar la contraseña' 
        });
      }
    }
  };

  const handleToggle = async (id) => {
    await alternarActivo(id);
    await load();
  };

  const handleDelete = async (id) => {
    const r = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar usuario?',
      text: 'Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!r.isConfirmed) return;
    await eliminarUsuario(id);
    await load();
    Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1000, showConfirmButton: false });
  };

  return (
    <div className="container" style={{ padding: '24px 0' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>👥 Usuarios</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Administra cuentas y roles del sistema</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo Usuario</button>
      </div>

      <form onSubmit={onSearch} style={{ display: 'flex', gap: 0, alignItems: 'center', marginBottom: 16 }}>
        <input
          className="form-input"
          placeholder="Buscar por DNI, nombre, email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 420, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        />
        <button className="btn btn-primary" type="submit" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: '12px 18px' }}>🔎 Buscar</button>
      </form>

      <div className="table-responsive" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 12 }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: 12, textAlign: 'left' }}>DNI</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Nombres</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Email</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Teléfono</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Rol</th>
              <th style={{ padding: 12 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 16 }}>Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 16 }}>Sin resultados</td></tr>
            ) : (
              items.map(u => (
                <tr key={u.id}>
                  <td style={{ padding: 12 }}>{u.dni}</td>
                  <td style={{ padding: 12 }}>{u.nombres} {u.apellidos}</td>
                  <td style={{ padding: 12 }}>{u.email || '-'}</td>
                  <td style={{ padding: 12 }}>{u.telefono || '-'}</td>
                  <td style={{ padding: 12 }}>
                    <span style={roleBadgeStyle(u.rol)}>{u.rol}</span>
                  </td>
                  <td style={{ padding: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button title="Editar" className="navbar-logout-icon" onClick={() => openEdit(u)} style={{ fontSize: '1.25rem' }}>✏️</button>
                    <button title="Cambiar Contraseña" className="navbar-logout-icon" onClick={() => handleCambiarPassword(u)} style={{ fontSize: '1.25rem', color: 'var(--warning-color)' }}>🔐</button>
                    <button title="Eliminar" className="navbar-logout-icon" onClick={() => handleDelete(u.id)} style={{ fontSize: '1.25rem', color: 'var(--danger-color)' }}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-secondary btn-sm" disabled={page<=1} onClick={() => setPage(p=>p-1)}>← Anterior</button>
        <span>Página {page} de {pages}</span>
        <button className="btn btn-secondary btn-sm" disabled={page>=pages} onClick={() => setPage(p=>p+1)}>Siguiente →</button>
        <select className="form-input" style={{ width: 90 }} value={limit} onChange={(e)=>{setLimit(parseInt(e.target.value)); setPage(1);}}>
          {[10,20,50].map(n=> <option key={n} value={n}>{n}/pag</option>)}
        </select>
      </div>

      {showModal && (
        <div
          className="users-modal-overlay"
          onClick={() => setShowModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', zIndex: 4000, padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 20, width: 560, maxWidth: '720px', border: '1px solid var(--border-color)', boxShadow: '0 24px 48px rgba(0,0,0,0.18)' }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">DNI</label>
                <input className="form-input" value={form.dni} onChange={e=>setForm({...form, dni: e.target.value})} maxLength={8} disabled={!!editing} required />
              </div>
              <div>
                <label className="form-label">Rol</label>
                <select className="form-input" value={form.rol} onChange={e=>setForm({...form, rol: e.target.value})}>
                  <option>Usuario</option>
                  <option>Administrador</option>
                </select>
              </div>
              <div>
                <label className="form-label">Nombres</label>
                <input className="form-input" value={form.nombres} onChange={e=>setForm({...form, nombres: e.target.value})} required />
              </div>
              <div>
                <label className="form-label">Apellidos</label>
                <input className="form-input" value={form.apellidos} onChange={e=>setForm({...form, apellidos: e.target.value})} required />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email || ''} onChange={e=>setForm({...form, email: e.target.value})} />
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input className="form-input" value={form.telefono || ''} onChange={e=>setForm({...form, telefono: e.target.value})} />
              </div>
              {!editing && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Contraseña</label>
                  <input className="form-input" type="password" value={form.clave} onChange={e=>setForm({...form, clave: e.target.value})} required />
                </div>
              )}
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
