const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');

/**
 * @route   GET /api/estadisticas/dashboard
 * @desc    Obtener estadísticas del dashboard
 * @access  Public
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Si no se especifica el año, usar el año actual
    const año = req.query.año || new Date().getFullYear();

    // Resumen general (evitar multiplicación pagos x deudas)
    const resumenResult = await query(`
      WITH pagos_agg AS (
        SELECT alumno_id, COUNT(*) AS cant_pagos, SUM(monto) AS monto_pagos
        FROM pagos WHERE año_academico=$1 GROUP BY alumno_id
      ), deudas_agg AS (
        SELECT alumno_id, SUM(monto_deuda) AS monto_deudas
        FROM deudas WHERE año_academico=$1 GROUP BY alumno_id
      )
      SELECT 
        (SELECT COUNT(*) FROM alumnos a WHERE a.activo=true AND a.año_academico=$1) AS totalAlumnos,
        COALESCE(SUM(p.cant_pagos),0) AS totalPagos,
        COALESCE(SUM(p.monto_pagos),0) AS totalIngresos,
        COALESCE(SUM(d.monto_deudas),0) AS totalDeudasMonto,
        COALESCE(SUM(GREATEST(COALESCE(d.monto_deudas,0) - COALESCE(p.monto_pagos,0), 0)),0) AS totalPendiente
      FROM alumnos a
      LEFT JOIN pagos_agg p ON p.alumno_id = a.id
      LEFT JOIN deudas_agg d ON d.alumno_id = a.id
      WHERE a.activo=true AND a.año_academico=$1
    `, [año]);

    // Ingresos por mes
    const ingresosResult = await query(`
      SELECT 
        tp.mes_pension,
        COUNT(p.id) as cantidad,
        COALESCE(SUM(p.monto), 0) as monto
      FROM tipos_pago tp
      LEFT JOIN pagos p ON tp.id = p.tipo_pago_id AND p.año_academico = $1
      WHERE tp.es_pension = true
      GROUP BY tp.mes_pension, tp.orden
      ORDER BY tp.orden
    `, [año]);

    // Estadísticas por grado (agregar por alumno y luego sumar por grado)
    const gradosResult = await query(`
      WITH pagos_agg AS (
        SELECT alumno_id, COUNT(*) AS cant_pagos, SUM(monto) AS monto_pagos
        FROM pagos WHERE año_academico=$1 GROUP BY alumno_id
      ), deudas_agg AS (
        SELECT alumno_id, SUM(monto_deuda) AS monto_deudas
        FROM deudas WHERE año_academico=$1 GROUP BY alumno_id
      )
      SELECT 
        g.id, g.nombre, g.nivel,
        COUNT(DISTINCT a.id) as totalAlumnos,
        COALESCE(SUM(p.cant_pagos),0) as pagos,
        COALESCE(SUM(p.monto_pagos), 0) as totalIngresos,
        COALESCE(SUM(d.monto_deudas), 0) as totalDeudas
      FROM grados g
      LEFT JOIN alumnos a ON g.id = a.grado_id AND a.activo = true AND a.año_academico = $1
      LEFT JOIN pagos_agg p ON p.alumno_id = a.id
      LEFT JOIN deudas_agg d ON d.alumno_id = a.id
      GROUP BY g.id, g.nombre, g.nivel
      ORDER BY g.orden
    `, [año]);

    // Últimos archivos procesados
    const archivosResult = await query(`
      SELECT 
        id, nombre_archivo, tipo_archivo, created_at,
        registros_procesados, errores_procesamiento
      FROM archivos_subidos
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Preparar datos para el frontend
    const ingresosPorMes = ingresosResult.rows.map(row => 
      parseFloat(row.monto || 0)
    );

    res.json({
      success: true,
      resumen: {
        totalAlumnos: parseInt(resumenResult.rows[0].totalalumnos),
        totalPagos: parseInt(resumenResult.rows[0].totalpagos),
        totalIngresos: parseFloat(resumenResult.rows[0].totalingresos),
        totalDeudas: parseFloat(resumenResult.rows[0].totaldeudasmonto),
        totalPendiente: parseFloat(resumenResult.rows[0].totalpendiente)
      },
      ingresosPorMes: ingresosPorMes,
      estadisticasPorGrado: gradosResult.rows.map(row => ({
        id: row.id,
        nombre: row.nombre,
        nivel: row.nivel,
        totalAlumnos: parseInt(row.totalalumnos || 0),
        totalIngresos: parseFloat(row.totalingresos || 0),
        alumnosConDeudas: parseInt(row.alumnoscondeuda || 0),
        totalDeudas: parseFloat(row.totaldeudas || 0)
      })),
      ultimosArchivos: archivosResult.rows
    });

/**
 * @route   GET /api/estadisticas/alumno/:id/deuda
 * @desc    Detalle de deuda y pagos por alumno: matrícula y meses
 */
router.get('/alumno/:id/deuda', async (req, res) => {
  try {
    const alumnoId = parseInt(req.params.id);
    const año = parseInt(req.query.año) || new Date().getFullYear();
    if (!alumnoId) return res.status(400).json({ success:false, message:'alumno_id requerido' });

    const deudasMatricula = await query(`
      SELECT COALESCE(SUM(d.monto_deuda),0) AS deuda
      FROM deudas d
      LEFT JOIN tipos_pago tp ON tp.id = d.tipo_pago_id
      WHERE d.alumno_id = $1 AND d.año_academico=$2 AND (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%')
    `, [alumnoId, año]);

    const pagosMatricula = await query(`
      SELECT COALESCE(SUM(p.monto),0) AS pagado
      FROM pagos p
      LEFT JOIN tipos_pago tp ON tp.id = p.tipo_pago_id
      WHERE p.alumno_id = $1 AND p.año_academico=$2 AND (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%')
    `, [alumnoId, año]);

    const deudasMeses = await query(`
      SELECT mes, COALESCE(SUM(monto_deuda),0) AS deuda
      FROM (
        SELECT 
          COALESCE(
            CASE 
              WHEN tp.nombre ILIKE '%ene%' OR tp.nombre ILIKE '%enero%' THEN 1
              WHEN tp.nombre ILIKE '%feb%' OR tp.nombre ILIKE '%febrero%' OR tp.nombre ILIKE '%-02%' OR tp.nombre ILIKE '%/02%' THEN 2
              WHEN tp.nombre ILIKE '%mar%' OR tp.nombre ILIKE '%marzo%' THEN 3
              WHEN tp.nombre ILIKE '%abr%' OR tp.nombre ILIKE '%abril%' THEN 4
              WHEN tp.nombre ILIKE '%may%' OR tp.nombre ILIKE '%mayo%' THEN 5
              WHEN tp.nombre ILIKE '%jun%' OR tp.nombre ILIKE '%junio%' THEN 6
              WHEN tp.nombre ILIKE '%jul%' OR tp.nombre ILIKE '%julio%' THEN 7
              WHEN tp.nombre ILIKE '%ago%' OR tp.nombre ILIKE '%agosto%' THEN 8
              WHEN tp.nombre ILIKE '%sep%' OR tp.nombre ILIKE '%sept%' OR tp.nombre ILIKE '%seti%' OR tp.nombre ILIKE '%septiembre%' OR tp.nombre ILIKE '%setiembre%' THEN 9
              WHEN tp.nombre ILIKE '%oct%' OR tp.nombre ILIKE '%octubre%' THEN 10
              WHEN tp.nombre ILIKE '%nov%' OR tp.nombre ILIKE '%noviembre%' THEN 11
              WHEN tp.nombre ILIKE '%dic%' OR tp.nombre ILIKE '%diciem%' OR tp.nombre ILIKE '%diciembre%' OR tp.nombre ILIKE '%-12%' OR tp.nombre ILIKE '%/12%' THEN 12
            END,
            tp.orden
          )::int AS mes,
          d.monto_deuda
        FROM deudas d
        JOIN tipos_pago tp ON tp.id = d.tipo_pago_id
        WHERE d.alumno_id=$1 AND d.año_academico=$2
          AND NOT (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%')
      ) t
      WHERE mes IS NOT NULL
      GROUP BY mes
      ORDER BY mes
    `, [alumnoId, año]);

    const pagosMeses = await query(`
      SELECT mes, COALESCE(SUM(monto),0) AS pagado
      FROM (
        SELECT 
          COALESCE(
            CASE 
              WHEN tp.nombre ILIKE '%ene%' OR tp.nombre ILIKE '%enero%' THEN 1
              WHEN tp.nombre ILIKE '%feb%' OR tp.nombre ILIKE '%febrero%' THEN 2
              WHEN tp.nombre ILIKE '%mar%' OR tp.nombre ILIKE '%marzo%' THEN 3
              WHEN tp.nombre ILIKE '%abr%' OR tp.nombre ILIKE '%abril%' THEN 4
              WHEN tp.nombre ILIKE '%may%' OR tp.nombre ILIKE '%mayo%' THEN 5
              WHEN tp.nombre ILIKE '%jun%' OR tp.nombre ILIKE '%junio%' THEN 6
              WHEN tp.nombre ILIKE '%jul%' OR tp.nombre ILIKE '%julio%' THEN 7
              WHEN tp.nombre ILIKE '%ago%' OR tp.nombre ILIKE '%agosto%' THEN 8
              WHEN tp.nombre ILIKE '%sep%' OR tp.nombre ILIKE '%sept%' OR tp.nombre ILIKE '%seti%' OR tp.nombre ILIKE '%septiembre%' OR tp.nombre ILIKE '%setiembre%' THEN 9
              WHEN tp.nombre ILIKE '%oct%' OR tp.nombre ILIKE '%octubre%' THEN 10
              WHEN tp.nombre ILIKE '%nov%' OR tp.nombre ILIKE '%noviembre%' THEN 11
              WHEN tp.nombre ILIKE '%dic%' OR tp.nombre ILIKE '%diciem%' OR tp.nombre ILIKE '%diciembre%' OR tp.nombre ILIKE '%-12%' OR tp.nombre ILIKE '%/12%' THEN 12
            END,
            tp.orden
          )::int AS mes,
          p.monto
        FROM pagos p
        JOIN tipos_pago tp ON tp.id = p.tipo_pago_id
        WHERE p.alumno_id=$1 AND p.año_academico=$2
          AND NOT (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%')
      ) sub
      WHERE mes IS NOT NULL
      GROUP BY mes
      ORDER BY mes
    `, [alumnoId, año]);

    const pagosMap = new Map(pagosMeses.rows.map(r => [parseInt(r.mes), parseFloat(r.pagado)]));
    const detalleMeses = Array.from({length:12}, (_,i)=>{
      const mes=i+1; const deuda=parseFloat((deudasMeses.rows.find(r=>parseInt(r.mes)===mes)?.deuda)||0);
      const pagado=pagosMap.get(mes)||0; return {mes, deuda, pagado, saldo: +(deuda - pagado)};
    });

    const matriculaDeuda = parseFloat(deudasMatricula.rows[0]?.deuda||0);
    const matriculaPagado = parseFloat(pagosMatricula.rows[0]?.pagado||0);

    res.json({ success:true, año, alumnoId, matricula:{ deuda:matriculaDeuda, pagado:matriculaPagado, saldo: +(matriculaDeuda-matriculaPagado) }, meses: detalleMeses });
  } catch (error) {
    console.error('Error deuda alumno:', error);
    res.status(500).json({ success:false, message:'Error interno'});
  }
});

/**
 * @route   GET /api/estadisticas/grado/:id/deuda
 * @desc    Detalle de deuda y pagos por grado: matrícula y meses (agregado)
 */
router.get('/grado/:id/deuda', async (req, res) => {
  try {
    const gradoId = parseInt(req.params.id);
    const año = parseInt(req.query.año) || new Date().getFullYear();
    if (!gradoId) return res.status(400).json({ success:false, message:'grado_id requerido' });

    const deudasMatricula = await query(`
      SELECT COALESCE(SUM(d.monto_deuda),0) AS deuda
      FROM deudas d
      LEFT JOIN alumnos a ON a.id = d.alumno_id
      LEFT JOIN tipos_pago tp ON tp.id = d.tipo_pago_id
      WHERE a.grado_id = $1 AND d.año_academico=$2 AND (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%')
    `, [gradoId, año]);

    const pagosMatricula = await query(`
      SELECT COALESCE(SUM(p.monto),0) AS pagado
      FROM pagos p
      LEFT JOIN alumnos a ON a.id = p.alumno_id
      LEFT JOIN tipos_pago tp ON tp.id = p.tipo_pago_id
      WHERE a.grado_id = $1 AND p.año_academico=$2 AND (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%')
    `, [gradoId, año]);

    const deudasMeses = await query(`
      SELECT mes, COALESCE(SUM(monto_deuda),0) AS deuda
      FROM (
        SELECT 
          COALESCE(
            CASE 
              WHEN tp.nombre ILIKE '%ene%' OR tp.nombre ILIKE '%enero%' THEN 1
              WHEN tp.nombre ILIKE '%feb%' OR tp.nombre ILIKE '%febrero%' THEN 2
              WHEN tp.nombre ILIKE '%mar%' OR tp.nombre ILIKE '%marzo%' THEN 3
              WHEN tp.nombre ILIKE '%abr%' OR tp.nombre ILIKE '%abril%' THEN 4
              WHEN tp.nombre ILIKE '%may%' OR tp.nombre ILIKE '%mayo%' THEN 5
              WHEN tp.nombre ILIKE '%jun%' OR tp.nombre ILIKE '%junio%' THEN 6
              WHEN tp.nombre ILIKE '%jul%' OR tp.nombre ILIKE '%julio%' THEN 7
              WHEN tp.nombre ILIKE '%ago%' OR tp.nombre ILIKE '%agosto%' THEN 8
              WHEN tp.nombre ILIKE '%sep%' OR tp.nombre ILIKE '%sept%' OR tp.nombre ILIKE '%seti%' OR tp.nombre ILIKE '%septiembre%' OR tp.nombre ILIKE '%setiembre%' THEN 9
              WHEN tp.nombre ILIKE '%oct%' OR tp.nombre ILIKE '%octubre%' THEN 10
              WHEN tp.nombre ILIKE '%nov%' OR tp.nombre ILIKE '%noviembre%' THEN 11
              WHEN tp.nombre ILIKE '%dic%' OR tp.nombre ILIKE '%diciem%' OR tp.nombre ILIKE '%diciembre%' OR tp.nombre ILIKE '%-12%' OR tp.nombre ILIKE '%/12%' THEN 12
            END,
            tp.orden
          )::int AS mes,
          d.monto_deuda
        FROM deudas d
        JOIN alumnos a ON a.id = d.alumno_id
        JOIN tipos_pago tp ON tp.id = d.tipo_pago_id
        WHERE a.grado_id=$1 AND d.año_academico=$2
          AND NOT (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%')
      ) t
      WHERE mes IS NOT NULL
      GROUP BY mes
      ORDER BY mes
    `, [gradoId, año]);

    const pagosMeses = await query(`
      SELECT mes, COALESCE(SUM(monto),0) AS pagado
      FROM (
        SELECT 
          COALESCE(
            CASE 
              WHEN tp.nombre ILIKE '%ene%' OR tp.nombre ILIKE '%enero%' THEN 1
              WHEN tp.nombre ILIKE '%feb%' OR tp.nombre ILIKE '%febrero%' THEN 2
              WHEN tp.nombre ILIKE '%mar%' OR tp.nombre ILIKE '%marzo%' THEN 3
              WHEN tp.nombre ILIKE '%abr%' OR tp.nombre ILIKE '%abril%' THEN 4
              WHEN tp.nombre ILIKE '%may%' OR tp.nombre ILIKE '%mayo%' THEN 5
              WHEN tp.nombre ILIKE '%jun%' OR tp.nombre ILIKE '%junio%' THEN 6
              WHEN tp.nombre ILIKE '%jul%' OR tp.nombre ILIKE '%julio%' THEN 7
              WHEN tp.nombre ILIKE '%ago%' OR tp.nombre ILIKE '%agosto%' THEN 8
              WHEN tp.nombre ILIKE '%sep%' OR tp.nombre ILIKE '%sept%' OR tp.nombre ILIKE '%seti%' OR tp.nombre ILIKE '%septiembre%' OR tp.nombre ILIKE '%setiembre%' THEN 9
              WHEN tp.nombre ILIKE '%oct%' OR tp.nombre ILIKE '%octubre%' THEN 10
              WHEN tp.nombre ILIKE '%nov%' OR tp.nombre ILIKE '%noviembre%' THEN 11
              WHEN tp.nombre ILIKE '%dic%' OR tp.nombre ILIKE '%diciem%' OR tp.nombre ILIKE '%diciembre%' OR tp.nombre ILIKE '%-12%' OR tp.nombre ILIKE '%/12%' THEN 12
            END,
            tp.orden
          )::int AS mes,
          p.monto
        FROM pagos p
        JOIN alumnos a ON a.id = p.alumno_id
        JOIN tipos_pago tp ON tp.id = p.tipo_pago_id
        WHERE a.grado_id=$1 AND p.año_academico=$2
          AND NOT (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%')
      ) t
      WHERE mes IS NOT NULL
      GROUP BY mes
      ORDER BY mes
    `, [gradoId, año]);

    const pagosMap = new Map(pagosMeses.rows.map(r => [parseInt(r.mes), parseFloat(r.pagado)]));
    const detalleMeses = Array.from({length:12}, (_,i)=>{
      const mes=i+1; const deuda=parseFloat((deudasMeses.rows.find(r=>parseInt(r.mes)===mes)?.deuda)||0);
      const pagado=pagosMap.get(mes)||0; return {mes, deuda, pagado, saldo: +(deuda - pagado)};
    });

    const matriculaDeuda = parseFloat(deudasMatricula.rows[0]?.deuda||0);
    const matriculaPagado = parseFloat(pagosMatricula.rows[0]?.pagado||0);

    res.json({ success:true, año, gradoId, matricula:{ deuda:matriculaDeuda, pagado:matriculaPagado, saldo: +(matriculaDeuda-matriculaPagado) }, meses: detalleMeses });
  } catch (error) {
    console.error('Error deuda grado:', error);
    res.status(500).json({ success:false, message:'Error interno'});
  }
});
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route   GET /api/estadisticas/meses
 * @desc    Totales por mes: matrícula, pensiones y total del año dado
 * @access  Public
 */
router.get('/meses', async (req, res) => {
  try {
    const año = parseInt(req.query.año) || new Date().getFullYear();

    // Pagos por mes (pensiones) y Pagos matrícula
    const pagosPensiones = await query(`
      SELECT mes, COALESCE(SUM(monto),0) AS pagado
      FROM (
        SELECT 
          COALESCE(
            CASE 
              WHEN tp.nombre ILIKE '%ene%' OR tp.nombre ILIKE '%enero%' THEN 1
              WHEN tp.nombre ILIKE '%feb%' OR tp.nombre ILIKE '%febrero%' THEN 2
              WHEN tp.nombre ILIKE '%mar%' OR tp.nombre ILIKE '%marzo%' THEN 3
              WHEN tp.nombre ILIKE '%abr%' OR tp.nombre ILIKE '%abril%' THEN 4
              WHEN tp.nombre ILIKE '%may%' OR tp.nombre ILIKE '%mayo%' THEN 5
              WHEN tp.nombre ILIKE '%jun%' OR tp.nombre ILIKE '%junio%' THEN 6
              WHEN tp.nombre ILIKE '%jul%' OR tp.nombre ILIKE '%julio%' THEN 7
              WHEN tp.nombre ILIKE '%ago%' OR tp.nombre ILIKE '%agosto%' THEN 8
              WHEN tp.nombre ILIKE '%sep%' OR tp.nombre ILIKE '%sept%' OR tp.nombre ILIKE '%seti%' OR tp.nombre ILIKE '%septiembre%' OR tp.nombre ILIKE '%setiembre%' THEN 9
              WHEN tp.nombre ILIKE '%oct%' OR tp.nombre ILIKE '%octubre%' THEN 10
              WHEN tp.nombre ILIKE '%nov%' OR tp.nombre ILIKE '%noviembre%' THEN 11
              WHEN tp.nombre ILIKE '%dic%' OR tp.nombre ILIKE '%diciem%' OR tp.nombre ILIKE '%diciembre%' OR tp.nombre ILIKE '%-12%' OR tp.nombre ILIKE '%/12%' THEN 12
            END,
            tp.orden
          )::int AS mes,
          p.monto
        FROM pagos p
        JOIN tipos_pago tp ON tp.id = p.tipo_pago_id
        WHERE p.año_academico=$1
          AND NOT (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%')
      ) t
      WHERE mes IS NOT NULL
      GROUP BY mes
      ORDER BY mes
    `, [año]);

    const pagosMatricula = await query(`
      SELECT COALESCE(SUM(p.monto),0) AS pagado
      FROM pagos p
      LEFT JOIN tipos_pago tp ON tp.id = p.tipo_pago_id
      WHERE p.año_academico=$1 AND (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%')
    `, [año]);

    // Deudas por mes (pensiones) y Deuda matrícula
    const deudasPensiones = await query(`
      SELECT mes, COALESCE(SUM(monto_deuda),0) AS deuda
      FROM (
        SELECT 
          COALESCE(
            CASE 
              WHEN tp.nombre ILIKE '%ene%' OR tp.nombre ILIKE '%enero%' THEN 1
              WHEN tp.nombre ILIKE '%feb%' OR tp.nombre ILIKE '%febrero%' THEN 2
              WHEN tp.nombre ILIKE '%mar%' OR tp.nombre ILIKE '%marzo%' THEN 3
              WHEN tp.nombre ILIKE '%abr%' OR tp.nombre ILIKE '%abril%' THEN 4
              WHEN tp.nombre ILIKE '%may%' OR tp.nombre ILIKE '%mayo%' THEN 5
              WHEN tp.nombre ILIKE '%jun%' OR tp.nombre ILIKE '%junio%' THEN 6
              WHEN tp.nombre ILIKE '%jul%' OR tp.nombre ILIKE '%julio%' THEN 7
              WHEN tp.nombre ILIKE '%ago%' OR tp.nombre ILIKE '%agosto%' THEN 8
              WHEN tp.nombre ILIKE '%sep%' OR tp.nombre ILIKE '%sept%' OR tp.nombre ILIKE '%seti%' OR tp.nombre ILIKE '%septiembre%' OR tp.nombre ILIKE '%setiembre%' THEN 9
              WHEN tp.nombre ILIKE '%oct%' OR tp.nombre ILIKE '%octubre%' THEN 10
              WHEN tp.nombre ILIKE '%nov%' OR tp.nombre ILIKE '%noviembre%' THEN 11
              WHEN tp.nombre ILIKE '%dic%' OR tp.nombre ILIKE '%diciem%' OR tp.nombre ILIKE '%diciembre%' OR tp.nombre ILIKE '%-12%' OR tp.nombre ILIKE '%/12%' THEN 12
            END,
            tp.orden
          )::int AS mes,
          d.monto_deuda
        FROM deudas d
        JOIN tipos_pago tp ON tp.id = d.tipo_pago_id
        WHERE d.año_academico=$1
          AND NOT (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%')
      ) t
      WHERE mes IS NOT NULL
      GROUP BY mes
      ORDER BY mes
    `, [año]);

    const deudasMatricula = await query(`
      SELECT COALESCE(SUM(d.monto_deuda),0) AS deuda
      FROM deudas d
      LEFT JOIN tipos_pago tp ON tp.id = d.tipo_pago_id
      WHERE d.año_academico=$1 AND (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%')
    `, [año]);

    // Armar meses 1..12 con pagado, deuda, total y acumulado_pagado
    const pagosMap = new Map(pagosPensiones.rows.map(r => [parseInt(r.mes), parseFloat(r.pagado)]));
    const deudasMap = new Map(deudasPensiones.rows.map(r => [parseInt(r.mes), parseFloat(r.deuda)]));
    const meses = Array.from({length:12}, (_,i)=>{
      const mes = i+1;
      const pagado = pagosMap.get(mes) || 0;
      const deuda = deudasMap.get(mes) || 0;
      return { mes, pagado, deuda, total: pagado, saldo: +(deuda - pagado) };
    });
    // acumulado pagado
    let acc = 0; meses.forEach(m => { acc += m.pagado; m.acumulado_pagado = acc; });

    const matricula = {
      pagado: parseFloat(pagosMatricula.rows[0]?.pagado || 0),
      deuda: parseFloat(deudasMatricula.rows[0]?.deuda || 0)
    };

    res.json({ success: true, año, matricula, meses });
  } catch (error) {
    console.error('Error obteniendo estadísticas por meses:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

/**
 * @route   GET /api/estadisticas/deudores/top
 * @desc    Obtener ranking de deudas: top alumnos y top grados
 * @access  Public
 */
router.get('/deudores/top', async (req, res) => {
  try {
    const año = parseInt(req.query.año) || new Date().getFullYear();
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    // Top alumnos deudores (por deuda pendiente)
    const topAlumnos = await query(`
      WITH pagos_agg AS (
        SELECT alumno_id, SUM(monto) AS pagado FROM pagos WHERE año_academico=$1 GROUP BY alumno_id
      ), deudas_agg AS (
        SELECT alumno_id, SUM(monto_deuda) AS deuda FROM deudas WHERE año_academico=$1 GROUP BY alumno_id
      )
      SELECT 
        a.id as alumno_id,
        a.dni,
        CONCAT(a.nombres, ' ', a.apellidos) as nombre,
        g.nombre as grado,
        COALESCE(p.pagado,0) as total_pagado,
        COALESCE(d.deuda,0) as deuda_total,
        GREATEST(COALESCE(d.deuda,0) - COALESCE(p.pagado,0), 0) as deuda_pendiente
      FROM alumnos a
      LEFT JOIN pagos_agg p ON p.alumno_id=a.id
      LEFT JOIN deudas_agg d ON d.alumno_id=a.id
      LEFT JOIN grados g ON a.grado_id = g.id
      WHERE a.año_academico=$1
      ORDER BY deuda_pendiente DESC
      LIMIT $2
    `, [año, limit]);

    // Top grados deudores por deuda pendiente (sin límite)
    const topGrados = await query(`
      WITH pagos_agg AS (
        SELECT alumno_id, SUM(monto) AS pagado FROM pagos WHERE año_academico=$1 GROUP BY alumno_id
      ), deudas_agg AS (
        SELECT alumno_id, SUM(monto_deuda) AS deuda FROM deudas WHERE año_academico=$1 GROUP BY alumno_id
      )
      SELECT 
        g.id as grado_id,
        g.nombre as grado,
        COALESCE(SUM(p.pagado),0) as total_pagado,
        COALESCE(SUM(d.deuda),0) as deuda_total,
        COALESCE(SUM(GREATEST(COALESCE(d.deuda,0) - COALESCE(p.pagado,0),0)),0) as deuda_pendiente
      FROM grados g
      LEFT JOIN alumnos a ON a.grado_id = g.id AND a.año_academico=$1 AND a.activo=true
      LEFT JOIN pagos_agg p ON p.alumno_id=a.id
      LEFT JOIN deudas_agg d ON d.alumno_id=a.id
      GROUP BY g.id, g.nombre
      HAVING COALESCE(SUM(GREATEST(COALESCE(d.deuda,0) - COALESCE(p.pagado,0),0)),0) > 0
      ORDER BY deuda_pendiente DESC
    `, [año]);

    res.json({
      success: true,
      año,
      limit,
      topAlumnos: topAlumnos.rows,
      topGrados: topGrados.rows
    });

  } catch (error) {
    console.error('Error obteniendo top deudores:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo top deudores',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route   GET /api/estadisticas/grados
 * @desc    Obtener estadísticas por grado
 * @access  Public
 */
router.get('/grados', async (req, res) => {
  try {
    const año = req.query.año || 2024;

    const result = await query(`
      SELECT 
        g.id, g.nombre, g.nivel,
        COUNT(DISTINCT a.id) as totalAlumnos,
        COALESCE(SUM(p.monto), 0) as totalIngresos,
        COALESCE(SUM(d.monto_deuda), 0) as totalDeudas
      FROM grados g
      LEFT JOIN alumnos a ON g.id = a.grado_id AND a.activo = true AND a.año_academico = $1
      LEFT JOIN pagos p ON a.id = p.alumno_id AND p.año_academico = $1
      LEFT JOIN deudas d ON a.id = d.alumno_id AND d.año_academico = $1
      GROUP BY g.id, g.nombre, g.nivel, g.orden
      ORDER BY g.orden
    `, [año]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas por grado:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas por grado',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route   DELETE /api/estadisticas/admin/reset
 * @desc    Eliminar TODOS los datos de un año académico (pagos y deudas)
 * @query   año: número, dryRun=true|false (opcional)
 */
router.delete('/admin/reset', async (req, res) => {
  const año = parseInt(req.query.año);
  const dryRun = String(req.query.dryRun || 'false').toLowerCase() === 'true';
  if (!año) return res.status(400).json({ success:false, message:'Parámetro año requerido' });

  try {
    if (dryRun) {
      const pagosCount = await query('SELECT COUNT(*)::int AS c FROM pagos WHERE año_academico=$1', [año]);
      const deudasCount = await query('SELECT COUNT(*)::int AS c FROM deudas WHERE año_academico=$1', [año]);
      return res.json({ success:true, dryRun:true, año, pagos: pagosCount.rows[0].c, deudas: deudasCount.rows[0].c });
    }

    await query('BEGIN');
    const pagosDel = await query('DELETE FROM pagos WHERE año_academico=$1 RETURNING id', [año]);
    const deudasDel = await query('DELETE FROM deudas WHERE año_academico=$1 RETURNING id', [año]);
    await query('COMMIT');

    res.json({ success:true, año, pagosEliminados: pagosDel.rows.length, deudasEliminadas: deudasDel.rows.length });
  } catch (error) {
    await query('ROLLBACK').catch(()=>{});
    console.error('Error en reset admin:', error);
    res.status(500).json({ success:false, message:'Error interno en reset' });
  }
});

// Versiones accesibles desde navegador (GET)
router.get('/admin/reset-dryrun', async (req, res) => {
  const año = parseInt(req.query.año);
  if (!año) return res.status(400).json({ success:false, message:'Parámetro año requerido' });
  try {
    const pagosCount = await query('SELECT COUNT(*)::int AS c FROM pagos WHERE año_academico=$1', [año]);
    const deudasCount = await query('SELECT COUNT(*)::int AS c FROM deudas WHERE año_academico=$1', [año]);
    res.json({ success:true, dryRun:true, año, pagos: pagosCount.rows[0].c, deudas: deudasCount.rows[0].c });
  } catch (error) {
    console.error('Error reset-dryrun:', error);
    res.status(500).json({ success:false, message:'Error interno' });
  }
});

router.get('/admin/reset-execute', async (req, res) => {
  const año = parseInt(req.query.año);
  const confirm = String(req.query.confirm || '').toUpperCase();
  if (!año) return res.status(400).json({ success:false, message:'Parámetro año requerido' });
  if (confirm !== 'SI') return res.status(400).json({ success:false, message:"Confirme con ?confirm=SI" });
  try {
    await query('BEGIN');
    const pagosDel = await query('DELETE FROM pagos WHERE año_academico=$1 RETURNING id', [año]);
    const deudasDel = await query('DELETE FROM deudas WHERE año_academico=$1 RETURNING id', [año]);
    await query('COMMIT');
    res.json({ success:true, año, pagosEliminados: pagosDel.rows.length, deudasEliminadas: deudasDel.rows.length });
  } catch (error) {
    await query('ROLLBACK').catch(()=>{});
    console.error('Error reset-execute:', error);
    res.status(500).json({ success:false, message:'Error interno' });
  }
});

/**
 * @route   GET /api/estadisticas/auditoria/pagos
 * @desc    Auditoría rápida de pagos por año: totales y agrupaciones
 */
router.get('/auditoria/pagos', async (req, res) => {
  try {
    const año = parseInt(req.query.año) || new Date().getFullYear();
    const total = await query(`SELECT COUNT(*)::int AS cantidad, COALESCE(SUM(monto),0)::float AS total FROM pagos WHERE año_academico=$1`, [año]);
    const porMonto = await query(`
      SELECT ROUND(monto::numeric,2) AS monto, COUNT(*)::int AS cantidad, COALESCE(SUM(monto),0)::float AS total
      FROM pagos WHERE año_academico=$1
      GROUP BY 1
      ORDER BY 1
    `, [año]);
    const porTipo = await query(`
      SELECT COALESCE(tp.nombre, CONCAT('tipo:', p.tipo_pago_id)) AS concepto,
             COUNT(*)::int AS cantidad,
             COALESCE(SUM(p.monto),0)::float AS total
      FROM pagos p
      LEFT JOIN tipos_pago tp ON tp.id = p.tipo_pago_id
      WHERE p.año_academico=$1
      GROUP BY 1
      ORDER BY concepto
    `, [año]);
    const topAlumnos = await query(`
      SELECT a.dni, CONCAT(a.nombres,' ',a.apellidos) AS alumno, COALESCE(SUM(p.monto),0)::float AS total
      FROM pagos p
      JOIN alumnos a ON a.id = p.alumno_id
      WHERE p.año_academico=$1
      GROUP BY a.dni, a.nombres, a.apellidos
      ORDER BY total DESC
      LIMIT 20
    `, [año]);

    res.json({ success:true, año, resumen: total.rows[0], porMonto: porMonto.rows, porTipo: porTipo.rows, topAlumnos: topAlumnos.rows });
  } catch (error) {
    console.error('Error auditoría pagos:', error);
    res.status(500).json({ success:false, message:'Error interno' });
  }
});

/**
 * @route   GET /api/estadisticas/auditoria/ultimo-pagadores
 * @desc    Devuelve el último registro de archivos_subidos para 'excel_pagadores' del año y sus errores
 */
router.get('/auditoria/ultimo-pagadores', async (req, res) => {
  try {
    const año = parseInt(req.query.año) || new Date().getFullYear();
    
    // Primero verificar si la columna año_academico existe
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'archivos_subidos' AND column_name = 'año_academico'
    `);
    
    let r;
    if (columnCheck.rows.length > 0) {
      // La columna existe, filtrar por año
      r = await query(`
        SELECT id, created_at, registros_procesados, errores_procesamiento
        FROM archivos_subidos
        WHERE tipo_archivo='excel_pagadores' AND (año_academico = $1 OR año_academico IS NULL)
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 1
      `, [año]);
    } else {
      // La columna no existe aún, obtener el último sin filtrar
      r = await query(`
        SELECT id, created_at, registros_procesados, errores_procesamiento
        FROM archivos_subidos
        WHERE tipo_archivo='excel_pagadores'
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 1
      `);
    }
    
    if (!r.rows.length) return res.json({ success:true, año, encontrado:false });
    let errores = null;
    try { errores = r.rows[0].errores_procesamiento ? JSON.parse(r.rows[0].errores_procesamiento) : null; } catch { errores = r.rows[0].errores_procesamiento; }
    res.json({ success:true, año, encontrado:true, created_at: r.rows[0].created_at, registros_procesados: r.rows[0].registros_procesados, errores });
  } catch (error) {
    console.error('Error auditoría ultimo-pagadores:', error);
    res.status(500).json({ success:false, message:'Error interno' });
  }
});

/**
 * @route   GET /api/estadisticas/saldo-por-grado
 * @desc    Obtener saldo pendiente por grado para un mes específico
 * @query   año, mes (opcional, 0=matrícula, 1-12=meses, null=total)
 */
router.get('/saldo-por-grado', async (req, res) => {
  try {
    const año = parseInt(req.query.año) || new Date().getFullYear();
    const mes = req.query.mes ? parseInt(req.query.mes) : null;

    // Mapeo de número de mes a nombre del mes (como están en la BD)
    const mesesNombres = ['', '', '', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    // Determinar el tipo de pago según el mes
    let whereTipoPago = '';
    if (mes === 0) {
      // Matrícula
      whereTipoPago = `AND tp.codigo = 'MAT'`;
    } else if (mes >= 3 && mes <= 12) {
      // Meses de Marzo a Diciembre - comparar con nombre del mes
      const nombreMes = mesesNombres[mes];
      whereTipoPago = `AND LOWER(tp.mes_pension) = '${nombreMes.toLowerCase()}'`;
    }
    // Si mes es null, no filtramos por tipo de pago (total general)

    const result = await query(`
      WITH pagos_agg AS (
        SELECT a.grado_id, SUM(p.monto) AS pagado
        FROM pagos p
        JOIN alumnos a ON a.id = p.alumno_id
        ${mes !== null ? 'JOIN tipos_pago tp ON tp.id = p.tipo_pago_id' : ''}
        WHERE p.año_academico = $1 ${whereTipoPago}
        GROUP BY a.grado_id
      ), deudas_agg AS (
        SELECT a.grado_id, SUM(d.monto_deuda) AS deuda
        FROM deudas d
        JOIN alumnos a ON a.id = d.alumno_id
        ${mes !== null ? 'JOIN tipos_pago tp ON tp.id = d.tipo_pago_id' : ''}
        WHERE d.año_academico = $1 ${whereTipoPago}
        GROUP BY a.grado_id
      )
      SELECT 
        g.id as grado_id,
        g.nombre as grado,
        COALESCE(p.pagado, 0) as pagado,
        COALESCE(d.deuda, 0) as deuda,
        GREATEST(COALESCE(d.deuda, 0) - COALESCE(p.pagado, 0), 0) as saldo
      FROM grados g
      LEFT JOIN pagos_agg p ON p.grado_id = g.id
      LEFT JOIN deudas_agg d ON d.grado_id = g.id
      WHERE (COALESCE(d.deuda, 0) - COALESCE(p.pagado, 0)) > 0
      ORDER BY saldo DESC, g.orden
    `, [año]);

    res.json({
      success: true,
      año,
      mes,
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo saldo por grado:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo saldo por grado',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route   GET /api/estadisticas/alumnos-deudores-mes
 * @desc    Obtener alumnos deudores de un grado específico para un mes
 * @query   año, grado_id, mes (0=matrícula, 3-12=meses)
 */
router.get('/alumnos-deudores-mes', async (req, res) => {
  try {
    const año = parseInt(req.query.año) || new Date().getFullYear();
    const grado_id = parseInt(req.query.grado_id);
    const mes = req.query.mes ? parseInt(req.query.mes) : null;

    if (!grado_id) {
      return res.status(400).json({ success: false, message: 'grado_id es requerido' });
    }

    // Mapeo de número de mes a nombre del mes
    const mesesNombres = ['', '', '', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    // Determinar el tipo de pago según el mes
    let whereTipoPago = '';
    if (mes === 0) {
      whereTipoPago = `AND tp.codigo = 'MAT'`;
    } else if (mes >= 3 && mes <= 12) {
      const nombreMes = mesesNombres[mes];
      whereTipoPago = `AND LOWER(tp.mes_pension) = '${nombreMes.toLowerCase()}'`;
    }

    const result = await query(`
      WITH pagos_mes AS (
        SELECT p.alumno_id, SUM(p.monto) AS pagado
        FROM pagos p
        ${mes !== null ? 'JOIN tipos_pago tp ON tp.id = p.tipo_pago_id' : ''}
        WHERE p.año_academico = $1 ${whereTipoPago}
        GROUP BY p.alumno_id
      ), deudas_mes AS (
        SELECT d.alumno_id, SUM(d.monto_deuda) AS deuda
        FROM deudas d
        ${mes !== null ? 'JOIN tipos_pago tp ON tp.id = d.tipo_pago_id' : ''}
        WHERE d.año_academico = $1 ${whereTipoPago}
        GROUP BY d.alumno_id
      )
      SELECT 
        a.id as alumno_id,
        a.dni,
        CONCAT(a.apellidos, ' ', a.nombres) as nombre,
        COALESCE(pm.pagado, 0) as pagado,
        COALESCE(dm.deuda, 0) as deuda_total,
        GREATEST(COALESCE(dm.deuda, 0) - COALESCE(pm.pagado, 0), 0) as saldo
      FROM alumnos a
      LEFT JOIN pagos_mes pm ON pm.alumno_id = a.id
      LEFT JOIN deudas_mes dm ON dm.alumno_id = a.id
      WHERE a.grado_id = $2 AND a.año_academico = $1
        AND GREATEST(COALESCE(dm.deuda, 0) - COALESCE(pm.pagado, 0), 0) > 0
      ORDER BY saldo DESC, a.apellidos, a.nombres
    `, [año, grado_id]);

    res.json({
      success: true,
      año,
      grado_id,
      mes,
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo alumnos deudores por mes:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo alumnos deudores',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

/**
 * @route   GET /api/estadisticas/resumen-por-anios
 * @desc    Obtener resumen de estadísticas de todos los años académicos
 * @access  Public
 */
router.get('/resumen-por-anios', async (req, res) => {
  try {
    const result = await query(`
      WITH años_con_datos AS (
        SELECT DISTINCT año_academico as año
        FROM (
          SELECT año_academico FROM alumnos WHERE activo = true
          UNION
          SELECT año_academico FROM pagos 
          UNION
          SELECT año_academico FROM deudas
        ) años
        WHERE año_academico IS NOT NULL
      ),
      stats_por_año AS (
        SELECT 
          a.año_academico as año,
          COALESCE(SUM(p.monto_pagos), 0) as total_pagado,
          COALESCE(SUM(d.monto_deudas), 0) as deuda_total,
          COALESCE(SUM(GREATEST(COALESCE(d.monto_deudas,0) - COALESCE(p.monto_pagos,0), 0)), 0) as saldo_pendiente
        FROM alumnos a
        LEFT JOIN (
          SELECT alumno_id, año_academico, SUM(monto) as monto_pagos
          FROM pagos
          GROUP BY alumno_id, año_academico
        ) p ON p.alumno_id = a.id AND p.año_academico = a.año_academico
        LEFT JOIN (
          SELECT alumno_id, año_academico, SUM(monto_deuda) as monto_deudas
          FROM deudas
          GROUP BY alumno_id, año_academico
        ) d ON d.alumno_id = a.id AND d.año_academico = a.año_academico
        WHERE a.activo = true
        GROUP BY a.año_academico
      )
      SELECT 
        acd.año,
        COALESCE(s.deuda_total, 0) as deuda_total,
        COALESCE(s.total_pagado, 0) as total_pagado,
        COALESCE(s.saldo_pendiente, 0) as saldo_pendiente
      FROM años_con_datos acd
      LEFT JOIN stats_por_año s ON s.año = acd.año
      ORDER BY acd.año DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error obteniendo resumen por años:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo resumen por años',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
});

module.exports = router;
