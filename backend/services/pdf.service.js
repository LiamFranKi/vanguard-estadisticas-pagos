const pdfParse = require('pdf-parse');
const fs = require('fs');
const { query } = require('../utils/database');
const moment = require('moment');

class PDFProcessor {
  constructor() {
    this.mesesPensiones = [
      'marzo', 'abril', 'mayo', 'junio', 
      'julio', 'agosto', 'setiembre', 
      'octubre', 'noviembre', 'diciembre'
    ];
  }

  detectarMesReporte(deudores) {
    // Usar SIEMPRE el mes actual del servidor como mes de reporte.
    // Regla de negocio: al subir en Octubre, se considera pagado hasta Septiembre para NO listados
    // y los pagos a generar para listados se limitan como máximo a Septiembre.
    const mesHoy = parseInt(moment().format('M'));
    return Math.min(Math.max(mesHoy, 3), 12);
  }

  mesNombreAIndice(nombre) {
    const n = (nombre||'').toLowerCase();
    if (n.includes('mar')) return 3;
    if (n.includes('abr')) return 4;
    if (n.includes('may')) return 5;
    if (n.includes('jun')) return 6;
    if (n.includes('jul')) return 7;
    if (n.includes('ago')) return 8;
    if (n.includes('set') || n.includes('sep')) return 9;
    if (n.includes('oct')) return 10;
    if (n.includes('nov')) return 11;
    if (n.includes('dic')) return 12;
    return null;
  }

  /**
   * Persiste un resumen y top luego del procesamiento del PDF.
   * Implementación segura (no-op) para evitar errores de ejecución.
   */
  async persistirResumenYTop(añoAcademico, resultados) {
    try {
      // En esta versión no persistimos un resumen adicional.
      // Esta función existe para evitar TypeError y permitir la carga del PDF.
      console.log(`ℹ️ Resumen PDF ${añoAcademico}: deudores=${resultados?.deudoresProcesados ?? 0}, deudasInsertadas=${resultados?.deudasInsertadas ?? 0}`);
      return;
    } catch (e) {
      // No bloquear el flujo por esta etapa opcional
      console.warn('Aviso: persistirResumenYTop no crítico:', e?.message);
    }
  }

  /**
   * Procesa archivo PDF de alumnos deudores
   * @param {string} filePath - Ruta del archivo PDF
   * @param {number} usuarioId - ID del usuario que sube el archivo
   * @param {number} añoAcademico - Año académico
   * @returns {Object} Resultado del procesamiento
   */
  async procesarPDFDeudores(filePath, usuarioId, añoAcademico = 2024) {
    try {
      console.log('📄 Iniciando procesamiento de PDF de deudores...');
      
      // Leer archivo PDF
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      
      // Extraer texto del PDF
      const textoPDF = pdfData.text;
      console.log('📄 Texto extraído del PDF:', textoPDF.substring(0, 500) + '...');

      // Procesar texto para extraer información de deudores
      const deudores = this.extraerDeudoresDelTexto(textoPDF);
      
      if (deudores.length === 0) {
        throw new Error('No se encontraron datos de deudores en el PDF');
      }

      const mesReporte = this.detectarMesReporte(deudores);
      console.log(`🗓️ Mes de reporte detectado: ${mesReporte}`);

      // Procesar cada deudor
      const resultados = {
        deudoresProcesados: 0,
        deudasInsertadas: 0, // legado (no insertaremos deudas desde PDF)
        pagosInsertados: 0,
        errores: [],
        resumen: {
          totalDeudores: deudores.length,
          totalDeuda: 0,
          deudasPorMes: {}
        }
      };

      // No limpiamos deudas ni pagos: trabajamos de forma idempotente

      const dnisEnPDF = new Set(deudores.map(d => d.dni));
      for (const deudor of deudores) {
        try {
          await this.procesarDeudorGenerarPagos(deudor, añoAcademico, resultados, mesReporte);
          resultados.deudoresProcesados++;
        } catch (error) {
          resultados.errores.push({
            deudor: deudor.nombre || 'Desconocido',
            error: error.message
          });
        }
      }

      // Alumnos NO listados en PDF: al día hasta el mes anterior al reporte
      const alumnosAno = await query(
        `SELECT id, dni FROM alumnos WHERE año_academico = $1 AND activo = true`,
        [añoAcademico]
      );
      for (const a of alumnosAno.rows) {
        if (!dnisEnPDF.has(String(a.dni))) {
          try {
            await this.procesarAlumnoNoListado(a.id, añoAcademico, resultados, mesReporte);
          } catch (e) {
            resultados.errores.push({ deudor: a.dni, error: e.message });
          }
        }
      }

      // Registrar archivo procesado
      await this.registrarArchivoProcesado(
        filePath, 
        'pdf', 
        usuarioId, 
        resultados.deudoresProcesados,
        resultados.errores.length > 0 ? JSON.stringify(resultados.errores) : null,
        añoAcademico
      );

      // Persistir resumen diario y top-N (Opción B)
      await this.persistirResumenYTop(añoAcademico, resultados);

      console.log('✅ Procesamiento de PDF completado');
      return resultados;

    } catch (error) {
      console.error('❌ Error procesando PDF:', error);
      throw error;
    }
  }

  /**
   * Extrae información de deudores del texto del PDF
   */
  extraerDeudoresDelTexto(texto) {
    const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);
    console.log('📄 Líneas encontradas:', lineas.length);

    // Mapa por DNI
    const mapa = new Map(); // dni -> { dni, nombre, grado, mesesDeuda:Set, montosPorMes:Map }

    // Regex robusta: DNI + ... + MENSUALIDAD <MES> <AÑO>
    const mesesRegex = '(?:MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SETIEMBRE|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)';
    // Captura: DNI ... MENSUALIDAD <MES> <AÑO> ... MONTO (primer número después del concepto)
    const rx = new RegExp(`(\\d{8}).*?MENSUALIDAD\\s+${mesesRegex}\\s+20\\d{2}[^\n\r]*?(\\d{2,7}(?:[.,]\\d{1,2})?)`, 'i');

    for (const linea of lineas) {
      const m = linea.match(rx);
      if (m) {
        const dni = m[1];
        const mesUpper = (linea.match(new RegExp(mesesRegex, 'i'))?.[0] || '').toLowerCase();
        const mesNorm = mesUpper.replace('septiembre','setiembre');
        const montoStr = m[2];
        const montoNum = parseFloat(String(montoStr).replace(',', '.'));

        if (!mapa.has(dni)) {
          mapa.set(dni, { dni, nombre: 'Desconocido', grado: 'No especificado', mesesDeuda: new Set(), montosPorMes: new Map() });
        }
        const ref = mapa.get(dni);
        ref.mesesDeuda.add(mesNorm);
        if (!isNaN(montoNum)) ref.montosPorMes.set(mesNorm, montoNum);
      }
    }

    // Fallback: usa el identificador anterior si no hubo matches
    if (mapa.size === 0) {
      const candidatos = [];
      for (const linea of lineas) {
        const patronAlumno = this.identificarPatronAlumno(linea);
        if (patronAlumno) candidatos.push(patronAlumno);
      }
      const deudoresFallback = candidatos.map(c => ({
        dni: c.dni,
        nombre: c.nombre,
        grado: c.grado,
        mesesDeuda: c.mesesDeuda || [],
        montoTotal: c.montoTotal || 0
      }));
      console.log(`📄 Parser fallback, encontrados: ${deudoresFallback.length}`);
      return deudoresFallback;
    }

    const deudores = Array.from(mapa.values()).map(v => ({
      dni: v.dni,
      nombre: v.nombre,
      grado: v.grado,
      mesesDeuda: Array.from(v.mesesDeuda),
      montosPdf: Object.fromEntries(v.montosPorMes),
      montoTotal: 0
    }));
    console.log(`👥 Deudores detectados por regex: ${deudores.length}`);
    return deudores;
  }

  /**
   * Identifica patrones de alumnos con deuda en una línea
   */
  identificarPatronAlumno(linea) {
    // Patrón 1: DNI - Nombre - Grado - Meses
    const patron1 = /(\d{8})\s+([A-Za-z\s]+)\s+([A-Za-z0-9\s]+)\s+([A-Za-z\s,]+)/;
    const match1 = linea.match(patron1);
    
    if (match1) {
      const [, dni, nombre, grado, mesesTexto] = match1;
      const mesesDeuda = this.extraerMesesDeTexto(mesesTexto);
      
      return {
        dni: dni.trim(),
        nombre: nombre.trim(),
        grado: grado.trim(),
        mesesDeuda: mesesDeuda,
        montoTotal: this.calcularMontoTotal(mesesDeuda)
      };
    }

    // Patrón 2: Nombre - DNI - Grado - Meses
    const patron2 = /([A-Za-z\s]+)\s+(\d{8})\s+([A-Za-z0-9\s]+)\s+([A-Za-z\s,]+)/;
    const match2 = linea.match(patron2);
    
    if (match2) {
      const [, nombre, dni, grado, mesesTexto] = match2;
      const mesesDeuda = this.extraerMesesDeTexto(mesesTexto);
      
      return {
        dni: dni.trim(),
        nombre: nombre.trim(),
        grado: grado.trim(),
        mesesDeuda: mesesDeuda,
        montoTotal: this.calcularMontoTotal(mesesDeuda)
      };
    }

    // Patrón 3: Solo DNI y nombre (buscar en líneas siguientes)
    const patron3 = /(\d{8})\s+([A-Za-z\s]+)/;
    const match3 = linea.match(patron3);
    
    if (match3) {
      const [, dni, nombre] = match3;
      
      return {
        dni: dni.trim(),
        nombre: nombre.trim(),
        grado: 'No especificado',
        mesesDeuda: [],
        montoTotal: 0
      };
    }

    return null;
  }

  /**
   * Extrae meses de deuda de un texto
   */
  extraerMesesDeTexto(texto) {
    const mesesEncontrados = [];
    const textoLower = texto.toLowerCase();
    
    for (const mes of this.mesesPensiones) {
      if (textoLower.includes(mes)) {
        mesesEncontrados.push(mes);
      }
    }
    
    return mesesEncontrados;
  }

  /**
   * Calcula monto total estimado de deuda
   */
  calcularMontoTotal(mesesDeuda) {
    // Monto promedio por pensión (se puede configurar)
    const montoPromedioPension = 500; // S/ 500 por pensión
    return mesesDeuda.length * montoPromedioPension;
  }

  /**
   * Procesa un deudor individual
   */
  async procesarDeudorGenerarPagos(deudor, añoAcademico, resultados, mesReporte) {
    // Buscar alumno por DNI
    const alumno = await query(
      `SELECT a.id, a.dni, a.nombres, a.apellidos, g.nombre as grado 
       FROM alumnos a 
       LEFT JOIN grados g ON a.grado_id = g.id 
       WHERE a.dni = $1 AND a.año_academico = $2`,
      [deudor.dni, añoAcademico]
    );

    if (alumno.rows.length === 0) {
      throw new Error(`Alumno no encontrado: ${deudor.dni} - ${deudor.nombre}`);
    }

    const alumnoData = alumno.rows[0];

    // Obtener deudas del alumno por concepto (incluye matricula y meses Mar..Dic)
    const deudasAlumno = await query(`
      SELECT 
        tp.id as tipo_pago_id,
        tp.nombre,
        d.monto_deuda,
        CASE 
          WHEN (tp.nombre ILIKE '%matr%' OR tp.nombre ILIKE '%inscri%') THEN 0
          WHEN tp.nombre ILIKE '%mar%' THEN 3
          WHEN tp.nombre ILIKE '%abr%' THEN 4
          WHEN tp.nombre ILIKE '%may%' THEN 5
          WHEN tp.nombre ILIKE '%jun%' THEN 6
          WHEN tp.nombre ILIKE '%jul%' THEN 7
          WHEN tp.nombre ILIKE '%ago%' THEN 8
          WHEN tp.nombre ILIKE '%sep%' OR tp.nombre ILIKE '%set%' THEN 9
          WHEN tp.nombre ILIKE '%oct%' THEN 10
          WHEN tp.nombre ILIKE '%nov%' THEN 11
          WHEN tp.nombre ILIKE '%dic%' OR tp.nombre ILIKE '%diciem%' THEN 12
          ELSE NULL
        END AS mes
      FROM deudas d
      JOIN tipos_pago tp ON tp.id = d.tipo_pago_id
      WHERE d.alumno_id = $1 AND d.año_academico = $2
    `, [alumnoData.id, añoAcademico]);

    const mapaPorMes = new Map(); // mesIndex -> {tipo_pago_id, monto}
    let matricula = null; // {tipo_pago_id, monto}
    for (const r of deudasAlumno.rows) {
      if (r.mes === 0) {
        matricula = { tipo_pago_id: r.tipo_pago_id, monto: Number(r.monto_deuda)||0 };
      } else if (r.mes) {
        mapaPorMes.set(parseInt(r.mes), { tipo_pago_id: r.tipo_pago_id, monto: Number(r.monto_deuda)||0 });
      }
    }

    if (!deudor.mesesDeuda || deudor.mesesDeuda.length === 0) {
      // Si el PDF no listó meses, no asumimos pagos
      return;
    }

    // Tomar el mes más temprano listado en el PDF para este alumno
    const indicesDeuda = deudor.mesesDeuda
      .map(m => this.mesNombreAIndice(m))
      .filter(x => !!x)
      .sort((a,b)=>a-b);
    if (!indicesDeuda.length) return;
    const primerMesConDeuda = indicesDeuda[0];

    // Generar pagos para Matrícula y meses [3 .. min(primerMesConDeuda-1, mesReporte-1)]
    const objetivos = [];
    if (matricula) objetivos.push({ mes: 0, ...matricula });
    const limite = Math.min(primerMesConDeuda, mesReporte) - 1;
    for (let m = 3; m <= limite; m++) {
      if (mapaPorMes.has(m)) objetivos.push({ mes: m, ...mapaPorMes.get(m) });
    }

    for (const obj of objetivos) {
      // Evitar duplicados
      const yaPago = await query(
        `SELECT 1 FROM pagos WHERE alumno_id=$1 AND tipo_pago_id=$2 AND año_academico=$3 LIMIT 1`,
        [alumnoData.id, obj.tipo_pago_id, añoAcademico]
      );
      if (yaPago.rows.length) continue;

      let monto = Number(obj.monto)||0;
      if (monto <= 0 && deudor.montosPdf) {
        // Fallback: si no hay deuda cargada para ese concepto, usar monto del PDF si aplica
        const nombreMes = obj.mes === 0 ? 'matricula' : ['','', '', 'marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'][obj.mes];
        const mp = deudor.montosPdf[nombreMes];
        monto = Number(mp)||0;
      }
      if (monto <= 0) continue;

      await query(
        `INSERT INTO pagos (alumno_id, tipo_pago_id, monto, fecha_pago, año_academico, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          alumnoData.id,
          obj.tipo_pago_id,
          monto,
          moment().format('YYYY-MM-DD'),
          añoAcademico,
          'Carga desde PDF: meses previos pagados'
        ]
      );
      resultados.pagosInsertados++;
    }
  }

  /**
   * Limpia deudas del día actual
   */
  async limpiarDeudasDelDia(añoAcademico) {
    const fechaHoy = moment().format('YYYY-MM-DD');
    
    console.log(`🧹 Limpiando deudas del día ${fechaHoy}...`);
    
    await query(
      'DELETE FROM deudas WHERE fecha_reporte = $1 AND año_academico = $2',
      [fechaHoy, añoAcademico]
    );
    
    console.log('✅ Deudas del día limpiadas');
  }

  /**
   * Registra el archivo procesado
   */
  async registrarArchivoProcesado(filePath, tipoArchivo, usuarioId, registrosProcesados, errores, añoAcademico) {
    const nombreArchivo = filePath.split('/').pop();
    
    // Ahora la columna año_academico ya existe, siempre insertar con ella
    await query(
      `INSERT INTO archivos_subidos 
       (nombre_archivo, tipo_archivo, ruta_archivo, tamaño_archivo, usuario_id, registros_procesados, errores_procesamiento, año_academico) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        nombreArchivo,
        tipoArchivo,
        filePath,
        0,
        usuarioId,
        registrosProcesados,
        errores,
        añoAcademico
      ]
    );
  }

  /**
   * Valida la estructura del PDF
   */
  validarEstructuraPDF(texto) {
    // Buscar indicadores de que es un archivo de deudores
    const indicadores = [
      'deudor', 'deuda', 'pensión', 'adeudo', 'moroso',
      'marzo', 'abril', 'mayo', 'junio'
    ];

    const textoLower = texto.toLowerCase();
    const indicadoresEncontrados = indicadores.filter(ind => 
      textoLower.includes(ind)
    );

    if (indicadoresEncontrados.length < 2) {
      return {
        valida: false,
        error: 'El PDF no parece contener información de deudores'
      };
    }

    return { valida: true };
  }
}

module.exports = PDFProcessor;
