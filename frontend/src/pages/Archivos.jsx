import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAño } from '../contexts/AñoContext';
import { listarArchivos, subirArchivo, eliminarArchivo as eliminarArchivoSvc } from '../services/archivos';

const Archivos = () => {
  const { añoActual, cambiarAño, obtenerAñosParaSelect, crearAño, eliminarAño } = useAño();
  const [deudasFile, setDeudasFile] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(2);
  const [total, setTotal] = useState(0);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [añoFiltro, setAñoFiltro] = useState('');
  const [progressDeudas, setProgressDeudas] = useState(0);
  const [progressExcel, setProgressExcel] = useState(0);

  useEffect(() => { load(); }, [page, limit, tipoFiltro, añoFiltro]);

  const load = async () => {
    try {
      const res = await listarArchivos({ page, limit, tipo: tipoFiltro || undefined, año: añoFiltro || undefined });
      setList(res?.data || []);
      setTotal(res?.pagination?.total || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadDeudas = async (e) => {
    e.preventDefault();
    if (!deudasFile) return Swal.fire({ icon: 'info', title: 'Selecciona un Excel principal (.xlsx)' });
    try {
      setLoading(true);
      await subirArchivo({ file: deudasFile, año: añoActual, tipo: 'excel_deudas', onProgress: setProgressDeudas });
      setDeudasFile(null);
      setProgressDeudas(0);
      await load();
      Swal.fire({ icon: 'success', title: 'Excel de Deudas procesado', timer: 1300, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error al subir Excel de Deudas', text: 'Verifica el formato .xlsx' });
    } finally { setLoading(false); }
  };

  const handleUploadExcel = async (e) => {
    e.preventDefault();
    if (!excelFile) return Swal.fire({ icon: 'info', title: 'Selecciona un Excel (.xlsx)' });
    try {
      setLoading(true);
      await subirArchivo({ file: excelFile, año: añoActual, tipo: 'excel_pagadores', onProgress: setProgressExcel });
      setExcelFile(null);
      setProgressExcel(0);
      await load();
      Swal.fire({ icon: 'success', title: 'Excel de Pagadores procesado', timer: 1300, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error al subir Excel de Pagadores', text: 'Verifica el formato .xlsx' });
    } finally { setLoading(false); }
  };

  // PDF deshabilitado/oculto por solicitud

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="container" style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>📁 Archivos</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Sube Excel Principal de Deudas y Excel de Alumnos Pagadores por año</p>
        </div>
        <div className="año-selector" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="año-archivos">Año:</label>
          <select id="año-archivos" value={añoActual} onChange={(e)=>cambiarAño(parseInt(e.target.value))} className="select-año">
            {obtenerAñosParaSelect().map(a=> <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            className="btn btn-primary"
            style={{ padding: '8px 12px' }}
            onClick={async () => {
              const { value: val } = await Swal.fire({
                title: 'Añadir año académico',
                input: 'number',
                inputAttributes: { min: 2015, max: 2035, step: 1 },
                inputLabel: 'Ingrese un año entre 2015 y 2035',
                showCancelButton: true,
                confirmButtonText: 'Crear'
              });
              if (!val) return;
              const n = parseInt(val);
              if (isNaN(n) || n < 2015 || n > 2035) {
                Swal.fire({ icon: 'error', title: 'Año inválido' });
                return;
              }
              try {
                await crearAño(n);
                Swal.fire({ icon: 'success', title: 'Año creado', timer: 1200, showConfirmButton: false });
              } catch (err) {
                Swal.fire({ icon: 'error', title: 'No se pudo crear', text: err?.response?.data?.message || 'Error' });
              }
            }}
          >
            + Añadir
          </button>
          <button
            className="btn btn-danger"
            style={{ padding: '8px 12px' }}
            onClick={async () => {
              if (!añoActual) return;
              try {
                // 1) Dry-run
                const { data: dr } = await axios.get('/api/estadisticas/admin/reset-dryrun', { params: { año: añoActual } });
                const r1 = await Swal.fire({
                  icon: 'warning',
                  title: `Reset año ${añoActual}?`,
                  html: `<div style="text-align:left">Se eliminarán:<br/>• Pagos: <b>${dr?.pagos ?? 0}</b><br/>• Deudas: <b>${dr?.deudas ?? 0}</b></div>`,
                  showCancelButton: true,
                  confirmButtonText: 'Resetear',
                  confirmButtonColor: '#ef4444',
                  cancelButtonText: 'Cancelar'
                });
                if (!r1.isConfirmed) return;
                // 2) Ejecutar reset
                await axios.get('/api/estadisticas/admin/reset-execute', { params: { año: añoActual, confirm: 'SI' } });
                await load();
                // 3) Preguntar si además desea eliminar el año de la configuración
                const r2 = await Swal.fire({
                  icon: 'question',
                  title: `¿También eliminar el año ${añoActual} de la lista?`,
                  text: 'Esto quita el año del selector (no necesario para limpiar datos).',
                  showCancelButton: true,
                  confirmButtonText: 'Sí, eliminar año',
                  cancelButtonText: 'Solo resetear'
                });
                if (r2.isConfirmed) {
                  await eliminarAño(añoActual);
                }
                Swal.fire({ icon: 'success', title: 'Operación completada', timer: 1200, showConfirmButton: false });
              } catch (err) {
                Swal.fire({ icon: 'error', title: 'No se pudo completar', text: err?.response?.data?.message || 'Error' });
              }
            }}
          >
            🗑️ Eliminar
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
        {/* Excel Principal de Deudas */}
        <form onSubmit={handleUploadDeudas} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>📑 Excel Principal de Deudas (.xlsx)</span>
            <div
              onDragOver={(e)=>{e.preventDefault();}}
              onDrop={(e)=>{e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(f && /\.xlsx|\.xls$/i.test(f.name)) setDeudasFile(f); }}
              style={{ border: '1px dashed var(--glass-border)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.5)'}}
              title="Arrastra y suelta aquí"
            >
              <input type="file" accept=".xlsx,.xls" onChange={(e)=>setDeudasFile(e.target.files?.[0]||null)} className="form-input" style={{ padding: 10 }} />
            </div>
            {deudasFile && (<span style={{ color: 'var(--text-secondary)' }}>{deudasFile.name}</span>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {progressDeudas > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Subiendo...</span>
                  <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>{Math.round(progressDeudas)}%</span>
                </div>
                <div style={{ width: '100%', height: 12, background: '#e5e7eb', borderRadius: 8, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ width: `${progressDeudas}%`, height: '100%', background: 'linear-gradient(90deg,#22c55e,#16a34a)', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Procesando…' : 'Subir Excel de Deudas'}</button>
          </div>
        </form>

        {/* Excel de Alumnos Pagadores */}
        <form onSubmit={handleUploadExcel} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>📊 Excel de Alumnos Pagadores (.xlsx)</span>
            <div
              onDragOver={(e)=>{e.preventDefault();}}
              onDrop={(e)=>{e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(f && /\.xlsx|\.xls$/i.test(f.name)) setExcelFile(f); }}
              style={{ border: '1px dashed var(--glass-border)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.5)'}}
              title="Arrastra y suelta aquí"
            >
              <input type="file" accept=".xlsx,.xls" onChange={(e)=>setExcelFile(e.target.files?.[0]||null)} className="form-input" style={{ padding: 10 }} />
            </div>
            {excelFile && (<span style={{ color: 'var(--text-secondary)' }}>{excelFile.name}</span>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {progressExcel > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Subiendo...</span>
                  <span style={{ fontSize: 13, color: '#3b82f6', fontWeight: 700 }}>{Math.round(progressExcel)}%</span>
                </div>
                <div style={{ width: '100%', height: 12, background: '#e5e7eb', borderRadius: 8, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                  <div style={{ width: `${progressExcel}%`, height: '100%', background: 'linear-gradient(90deg,#60a5fa,#3b82f6)', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Procesando…' : 'Subir Excel de Pagadores'}</button>
          </div>
        </form>
      </div>

      {/* Filtros de historial */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <select className="select-año" value={añoFiltro} onChange={(e)=>{ setAñoFiltro(e.target.value); setPage(1); }}>
          <option value="">Todos los años</option>
          {obtenerAñosParaSelect().map(a=> <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="select-año" value={tipoFiltro} onChange={(e)=>{ setTipoFiltro(e.target.value); setPage(1); }}>
          <option value="">Todos los tipos</option>
          <option value="excel">Excel</option>
          <option value="pdf">PDF</option>
        </select>
      </div>

      <div className="table-responsive" style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 12 }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: 12, textAlign: 'left' }}>Archivo</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Tipo</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Año</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Registros</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Fecha</th>
              <th style={{ padding: 12, textAlign: 'left' }}>Estado</th>
              <th style={{ padding: 12 }}></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 16 }}>Sin archivos</td></tr>
            ) : (
              list.map(a => (
                <tr key={a.id}>
                  <td style={{ padding: 12 }}>{a.nombre_archivo}</td>
                  <td style={{ padding: 12 }}>{a.tipo_archivo?.toUpperCase?.() || '-'}</td>
                  <td style={{ padding: 12 }}>{a.año_academico || '-'}</td>
                  <td style={{ padding: 12 }}>{a.registros_procesados ?? '-'}</td>
                  <td style={{ padding: 12 }}>{new Date(a.created_at).toLocaleString('es-PE')}</td>
                  <td style={{ padding: 12 }}>{a.errores_procesamiento ? '⚠️ Con errores' : '✅ OK'}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={async ()=>{
                        const r = await Swal.fire({
                          icon: 'warning',
                          title: 'Eliminar archivo?',
                          text: 'Se eliminará del historial y se borrará el archivo físico.',
                          showCancelButton: true,
                          confirmButtonText: 'Eliminar',
                          confirmButtonColor: '#ef4444',
                          cancelButtonText: 'Cancelar'
                        });
                        if (!r.isConfirmed) return;
                        try {
                          await eliminarArchivoSvc(a.id);
                          await load();
                          Swal.fire({ icon: 'success', title: 'Archivo eliminado', timer: 1000, showConfirmButton: false });
                        } catch (err) {
                          Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: err?.response?.data?.message || 'Error' });
                        }
                      }}
                    >🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-secondary btn-sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Anterior</button>
        <span>Página {page} de {pages}</span>
        <button className="btn btn-secondary btn-sm" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Siguiente →</button>
        <select className="form-input" style={{ width: 90 }} value={limit} onChange={(e)=>{setLimit(parseInt(e.target.value)); setPage(1);}}>
          {[2,5,10].map(n=> <option key={n} value={n}>{n}/pag</option>)}
        </select>
      </div>
    </div>
  );
};

export default Archivos;
