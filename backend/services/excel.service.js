const XLSX = require('xlsx');
const { query } = require('../utils/database');
const moment = require('moment');

class ExcelProcessor {
  constructor() {
    this.mesesPensiones = [
      'marzo', 'abril', 'mayo', 'junio', 
      'julio', 'agosto', 'setiembre', 'septiembre',
      'octubre', 'noviembre', 'diciembre'
    ];
    // Sinónimos aceptados para columnas base
    this.colSyn = {
      grado: ['grado', 'grado/aula', 'aula', 'seccion', 'sección', 'nivel', 'grupo'],
      nombre: ['nombre', 'alumno', 'estudiante', 'apellidos y nombres', 'nombres y apellidos', 'nombre completo'],
      dni: ['dni', 'documento', 'nro documento', 'número de documento', 'num doc', 'doc', 'id'],
      matricula: ['matricula', 'matrícula', 'monto matricula', 'monto matrícula', 'matricula total']
    };
    // Cache simple en memoria para tipos_pago { codigo -> id }
    this._tipoPagoCache = new Map();
  }

  // Parser robusto para montos con monedas, separadores y decimales locales
  _parseMonto(v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return v;
    let s = String(v).trim();
    if (!s) return NaN;
    // eliminar símbolos de moneda y letras
    s = s.replace(/[^0-9,.-]/g, '');
    // si tiene ambos "," y ".", asumir "," como decimal y "." como miles
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');
    if (hasComma && hasDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
      // solo coma -> decimal
      s = s.replace(',', '.');
    } else {
      // solo punto o ninguno: ya usable, pero quitar miles si formateado tipo 1.000
      // si hay más de un punto, quitar todos excepto el último
      const parts = s.split('.');
      if (parts.length > 2) {
        const last = parts.pop();
        s = parts.join('') + '.' + last;
      }
    }
    const n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  _hashText(str) {
    let h = 0; const s = String(str||'');
    for (let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; }
    return Math.abs(h).toString(36);
  }

  async _getTipoPagoIdPorConcepto(concepto) {
    const c = this.normalizarTexto(concepto);
    // Matrícula
    if (/(matric|inscri)/.test(c)) {
      const r = await query(`SELECT id FROM tipos_pago WHERE nombre ILIKE '%matr%' OR nombre ILIKE '%inscri%' LIMIT 1`);
      if (r.rows.length) return r.rows[0].id;
    }
    // Meses
    const map = [null,null,'', 'mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    for (let m=3;m<=12;m++){
      const tok = map[m];
      if (tok && (c.includes(tok) || (m===9 && (c.includes('set')||c.includes('sept'))))) {
        const r = await query(`SELECT id FROM tipos_pago WHERE (nombre ILIKE $1 OR nombre ILIKE $2) LIMIT 1`, [
          `%${tok}%`, m===9?`%set%`:`%${tok}%`
        ]);
        if (r.rows.length) return r.rows[0].id;
      }
    }
    // Fallback por codigo PEN_XXX
    const codigo = `PEN_${(concepto||'').toString().trim().substring(0,3).toUpperCase()}`;
    const r2 = await query('SELECT id FROM tipos_pago WHERE codigo=$1', [codigo]);
    if (r2.rows.length) return r2.rows[0].id;
    throw new Error(`No se pudo mapear CONCEPTO a tipo_pago: ${concepto}`);
  }

  async _insertarPagoIdempotente({ alumnoId, tipoPagoId, monto, añoAcademico, marca }) {
    const existe = await query(
      `SELECT 1 FROM pagos WHERE alumno_id=$1 AND tipo_pago_id=$2 AND año_academico=$3 AND observaciones ILIKE $4 LIMIT 1`,
      [alumnoId, tipoPagoId, añoAcademico, `%${marca}%`]
    );
    if (existe.rows.length) return false;
    await query(
      `INSERT INTO pagos (alumno_id, tipo_pago_id, monto, fecha_pago, año_academico, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [alumnoId, tipoPagoId, parseFloat(monto), moment().format('YYYY-MM-DD'), añoAcademico, `Excel Pagadores | ${marca}`]
    );
    return true;
  }

  async _obtenerAlumnoIdPorDNI(dni, añoAcademico, nombreFallback, gradoFallback) {
    const sel = await query('SELECT id FROM alumnos WHERE dni=$1 AND año_academico=$2', [dni, añoAcademico]);
    if (sel.rows.length) return sel.rows[0].id;
    // Crear mínimo si no existe
    const gradoId = await this.obtenerOCrearGrado(gradoFallback||'Sin grado');
    const partes = String(nombreFallback||'').trim().split(' ');
    const nombres = partes.slice(0, -2).join(' ') || (partes[0]||'Alumno');
    const apellidos = partes.slice(-2).join(' ') || 'Sin Apellidos';
    const ins = await query(
      `INSERT INTO alumnos (dni, nombres, apellidos, grado_id, año_academico)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [dni, nombres, apellidos, gradoId, añoAcademico]
    );
    return ins.rows[0].id;
  }

  async procesarExcelPagadoresFilas(filePath, usuarioId, añoAcademico=2024) {
    console.log('📊 Iniciando importación Excel Alumnos Pagadores...');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header:1 });
    if (data.length < 2) throw new Error('Excel vacío');
    // Detectar cabeceras en las primeras filas
    const norm = (v)=>this.normalizarTexto(v);
    const isHeaderRow = (row)=>{
      if (!row || row.length===0) return false;
      const cells = (row||[]).map(c=>norm(c||''));
      const hasDNI = cells.some(c=>/\bdni\b|document/.test(c));
      const hasConcepto = cells.some(c=>/concepto|\bmes\b/.test(c));
      const hasPagado = cells.some(c=>/\bpagado\b|monto|importe/.test(c)) || cells.some(c=>/a pagar/.test(c));
      return hasDNI && hasConcepto && hasPagado;
    };
    let headerRowIndex = 0;
    for (let r=0;r<Math.min(10,data.length);r++){
      if (isHeaderRow(data[r])) { headerRowIndex = r; break; }
    }
    const headers = (data[headerRowIndex]||[]).map(h=>String(h||''));
    const findIdx = (syns)=> headers.findIndex(h=>syns.some(s=>norm(h).includes(norm(s))));
    const idxDNI = findIdx(['dni','documento','doc']);
    const idxConcepto = findIdx(['concepto','mes']);
    // Buscar "A PAGAR" con detección mejorada
    const idxAPagar = headers.findIndex(h => {
      const nh = norm(h);
      return nh.includes('a pagar') || nh.includes('apagar');
    });
    const idxPagadoStrict = findIdx(['pagado s/.','pagado s/','pagado']);
    const idxMontoGeneric = findIdx(['monto','importe']);
    // Prioridad: A PAGAR > PAGADO > MONTO
    const idxPagado = idxAPagar>=0 ? idxAPagar : (idxPagadoStrict>=0 ? idxPagadoStrict : idxMontoGeneric);
    
    console.log('📋 Columnas detectadas:');
    console.log(`   DNI: columna ${idxDNI} (${headers[idxDNI]})`);
    console.log(`   CONCEPTO: columna ${idxConcepto} (${headers[idxConcepto]})`);
    console.log(`   A PAGAR: columna ${idxAPagar} (${headers[idxAPagar]})`);
    console.log(`   PAGADO: columna ${idxPagadoStrict} (${headers[idxPagadoStrict]})`);
    console.log(`   → Usando columna ${idxPagado} (${headers[idxPagado]}) para montos`);
    const idxNombre = findIdx(['alumno','nombre']);
    const idxGrupo = findIdx(['grupo','grado','aula','seccion','sección']);
    // Detectar modo matriz: no hay columna concepto/pagado únicas, pero existen columnas de meses y/o matrícula
    const monthCols = this.mesesPensiones.map(m => ({ mes:m, idx: headers.findIndex(h => norm(h).includes(norm(m))) })).filter(x => x.idx>=0);
    const idxMatriculaCol = headers.findIndex(h => /(matric|inscri)/i.test(String(h)));
    const esMatriz = (idxConcepto<0 || idxPagado<0) && (monthCols.length>0 || idxMatriculaCol>=0);
    if (!esMatriz && (idxDNI<0 || idxConcepto<0 || idxPagado<0)) throw new Error('Faltan columnas requeridas: DNI, CONCEPTO, PAGADO');

    const resultados = { filas:0, pagosInsertados:0, errores:[], totalImporte:0, filasSkipped:0 };
    for (let i=headerRowIndex+1;i<data.length;i++){
      const row = data[i]||[];
      const dni = String(row[idxDNI]||'').replace(/\D/g,'');
      // Permitir DNIs de 7, 8 o 9 dígitos (alumnos extranjeros)
      if (!dni || dni.length < 7 || dni.length > 9) {
        resultados.filasSkipped++;
        continue;
      }

      if (esMatriz) {
        // Modo matriz: por cada columna (matrícula y meses) insertar pago si > 0
        try {
          const alumnoId = await this._obtenerAlumnoIdPorDNI(dni, añoAcademico, row[idxNombre], row[idxGrupo]);
          // Matrícula
          if (idxMatriculaCol>=0) {
            const v = this._parseMonto(row[idxMatriculaCol]);
            if (v>0) {
              const tipoPagoId = await this._getTipoPagoId('MAT');
              const concepto='matricula';
              const marca = `dni:${dni}|c:${concepto}|m:${v}|a:${añoAcademico}|h:${this._hashText(`${dni}|${concepto}|${v}|${añoAcademico}`)}`;
              const ok = await this._insertarPagoIdempotente({ alumnoId, tipoPagoId, monto: v, añoAcademico, marca });
              if (ok) resultados.pagosInsertados++;
              resultados.totalImporte += v;
            }
          }
          // Meses
          for (const mc of monthCols){
            const v = this._parseMonto(row[mc.idx]);
            if (v>0) {
              const codigo = `PEN_${mc.mes.substring(0,3).toUpperCase()}`;
              const tipoPagoId = await this._getTipoPagoId(codigo);
              const concepto = mc.mes;
              const marca = `dni:${dni}|c:${concepto}|m:${v}|a:${añoAcademico}|h:${this._hashText(`${dni}|${concepto}|${v}|${añoAcademico}`)}`;
              const ok = await this._insertarPagoIdempotente({ alumnoId, tipoPagoId, monto: v, añoAcademico, marca });
              if (ok) resultados.pagosInsertados++;
              resultados.totalImporte += v;
            }
          }
          resultados.filas++;
        } catch(e){
          resultados.errores.push({ fila:i+1, dni, concepto:'matricula/meses', montoIntentado: null, error:e.message });
        }
      } else {
        // Modo filas: DNI + CONCEPTO + PAGADO
        const concepto = row[idxConcepto];
        const pagado = this._parseMonto(row[idxPagado]);
        if (!concepto || !(pagado>0)) continue;
        try{
          const alumnoId = await this._obtenerAlumnoIdPorDNI(dni, añoAcademico, row[idxNombre], row[idxGrupo]);
          const tipoPagoId = await this._getTipoPagoIdPorConcepto(concepto);
          const marca = `dni:${dni}|c:${this.normalizarTexto(concepto)}|m:${pagado}|a:${añoAcademico}|h:${this._hashText(`${dni}|${concepto}|${pagado}|${añoAcademico}`)}`;
          const ok = await this._insertarPagoIdempotente({ alumnoId, tipoPagoId, monto: pagado, añoAcademico, marca });
          if (ok) resultados.pagosInsertados++;
          resultados.totalImporte += pagado;
          resultados.filas++;
        }catch(e){
          resultados.errores.push({ fila:i+1, dni, concepto, montoIntentado: pagado, error:e.message });
        }
      }
    }

    // Registrar archivo en historial
    await this.registrarArchivoProcesado(filePath, 'excel_pagadores', usuarioId, resultados.filas, resultados.errores.length?JSON.stringify(resultados.errores):null, añoAcademico);
    console.log('✅ Importación Excel Pagadores completada');
    console.log(`📊 Resumen: ${resultados.filas} filas procesadas, ${resultados.pagosInsertados} pagos insertados, ${resultados.filasSkipped} filas saltadas`);
    console.log(`💰 Total importado: S/ ${resultados.totalImporte.toFixed(2)}`);
    return resultados;
  }

  // Determina si una fila corresponde a un alumno usando headers actuales
  _esFilaAlumno(fila, headers) {
    const dni = this.extraerValor(fila, headers, this.colSyn.dni);
    const nombre = this.extraerValor(fila, headers, this.colSyn.nombre);
    // Consideramos alumno si al menos tiene DNI o nombre (preferimos DNI)
    return Boolean(dni || nombre);
  }

  // Inserta una DEUDA en lugar de pago (para Excel)
  async insertarDeuda(alumnoId, codigoTipoPago, monto, añoAcademico) {
    // Obtener ID del tipo de pago (cacheado)
    const tipoPagoId = await this._getTipoPagoId(codigoTipoPago);
    await query(
      `INSERT INTO deudas (alumno_id, tipo_pago_id, monto_deuda, fecha_reporte, año_academico)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        alumnoId,
        tipoPagoId,
        monto,
        moment().format('YYYY-MM-DD'),
        añoAcademico
      ]
    );
  }

  // Obtiene el id de tipos_pago por codigo, con cache en memoria
  async _getTipoPagoId(codigo) {
    if (this._tipoPagoCache.has(codigo)) return this._tipoPagoCache.get(codigo);
    const res = await query('SELECT id FROM tipos_pago WHERE codigo = $1', [codigo]);
    if (res.rows.length === 0) throw new Error(`Tipo de pago no encontrado: ${codigo}`);
    const id = res.rows[0].id;
    this._tipoPagoCache.set(codigo, id);
    return id;
  }

  // Busca el título de bloque (grado/sección) cerca de una fila dada
  findTituloCercano(data, rowIndex, añoAcademico) {
    const toText = (fila) => (fila || []).map(v => this.normalizarTexto(v)).join(' ').trim();
    const isTitulo = (txt) => {
      if (!txt) return false;
      const tieneAnio = txt.includes(String(añoAcademico));
      const tieneNivel = /(inicial|primaria|secundaria)/.test(txt);
      const tieneGrado = /(\b[1-6][ºo°]?\b|año|grados?)/.test(txt);
      return (tieneAnio && tieneNivel && tieneGrado) || /\bunica\b|\búnica\b|\b[a-d]\b/.test(txt);
    };
    // mirar hacia arriba 3 y hacia abajo 3
    for (let delta = 0; delta <= 3; delta++) {
      const up = rowIndex - delta; const down = rowIndex + delta;
      if (up >= 0) {
        const t = toText(data[up]);
        if (isTitulo(t)) return (data[up] || []).filter(Boolean).join(' ').trim();
      }
      if (down < data.length) {
        const t = toText(data[down]);
        if (isTitulo(t)) return (data[down] || []).filter(Boolean).join(' ').trim();
      }
    }
    return null;
  }

  // Normaliza texto: minúsculas, sin tildes, trim
  normalizarTexto(v) {
    return String(v || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  // Detecta fila de cabeceras en las primeras filas
  detectarHeaders(data) {
    const maxScan = Math.min(8, data.length);
    for (let r = 0; r < maxScan; r++) {
      const row = data[r] || [];
      // Validar usando la misma lógica de estructura
      const valid = this.validarEstructuraExcel(row).valida;
      if (valid) {
        return { headers: row, headerRowIndex: r };
      }
    }
    return { headers: data[0] || [], headerRowIndex: 0 };
  }

  /**
   * Procesa archivo Excel de pagos totales
   * @param {string} filePath - Ruta del archivo Excel
   * @param {number} usuarioId - ID del usuario que sube el archivo
   * @param {number} añoAcademico - Año académico
   * @returns {Object} Resultado del procesamiento
   */
  async procesarExcelPagos(filePath, usuarioId, añoAcademico = 2024) {
    try {
      console.log('📊 Iniciando procesamiento de Excel de pagos...');
      
      // Leer archivo Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir a JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (data.length < 2) {
        throw new Error('El archivo Excel no contiene datos suficientes');
      }

      // Detectar fila de headers en las primeras 5 filas
      const { headers, headerRowIndex } = this.detectarHeaders(data);
      console.log('📋 Headers usados:', headers);

      // Validar estructura esperada
      const estructuraValida = this.validarEstructuraExcel(headers);
      if (!estructuraValida.valida) {
        throw new Error(`Estructura de Excel inválida: ${estructuraValida.error}`);
      }

      // Procesar datos
      const resultados = {
        alumnosProcesados: 0,
        pagosInsertados: 0,
        errores: [],
        resumen: {
          totalMatriculas: 0,
          totalPensiones: 0,
          montoTotalMatriculas: 0,
          montoTotalPensiones: 0
        }
      };

      // Limpiar datos existentes del año académico
      await this.limpiarDatosAnteriores(añoAcademico);

      // Procesamiento por bloques (grado/sección → headers → filas → totales)
      let headersActuales = headers;
      let gradoContext = null;
      for (let i = 0; i < data.length; i++) {
        const fila = data[i] || [];
        const filaTexto = (fila.map(v => this.normalizarTexto(v)).join(' ').trim());
        const esVacia = fila.every(v => v === undefined || v === null || String(v).trim() === '');
        if (esVacia) continue;

        // Detectar texto de grado/sección (línea título del bloque)
        // Heurística: contiene palabras como inicial/primaria/secundaria/años/año/grado y el año académico
        if (/\b(inicial|primaria|secundaria|años|anio|año|grado)\b/.test(filaTexto) && filaTexto.includes(String(añoAcademico))) {
          gradoContext = fila.filter(Boolean).join(' ').trim();
          continue;
        }

        // Detectar fila de headers: contiene 'alumno' y 'dni'
        const esHeader = fila.some(h => this.normalizarTexto(h).includes('alumno')) && fila.some(h => this.normalizarTexto(h).includes('dni'));
        if (esHeader) {
          headersActuales = fila;
          // al detectar cabecera, buscar título cercano (arriba/abajo)
          const titulo = this.findTituloCercano(data, i, añoAcademico);
          if (titulo) gradoContext = titulo;
          continue;
        }

        // Saltar filas de totales
        if (fila.some(c => this.normalizarTexto(c).startsWith('totales')) || filaTexto.includes('total anuales') || filaTexto.startsWith('total')) {
          continue;
        }

        // No re-detectar título en filas de datos; el contexto se actualiza al detectar cabeceras

        // Validación robusta: procesar solo si tenemos al menos DNI o nombre
        if (!this._esFilaAlumno(fila, headersActuales)) continue;

        // Procesar fila de alumno con headersActuales y gradoContext como fallback
        try {
          await this.procesarFilaAlumno(fila, headersActuales, añoAcademico, resultados, gradoContext);
          resultados.alumnosProcesados++;
        } catch (error) {
          resultados.errores.push({ fila: i + 1, error: error.message, datos: fila.slice(0, 8) });
        }
      }

      // Registrar archivo procesado (con versión por año)
      await this.registrarArchivoProcesado(
        filePath, 
        'excel_deudas', 
        usuarioId, 
        resultados.alumnosProcesados,
        resultados.errores.length > 0 ? JSON.stringify(resultados.errores) : null,
        añoAcademico
      );

      console.log('✅ Procesamiento de Excel completado');
      return resultados;

    } catch (error) {
      console.error('❌ Error procesando Excel:', error);
      throw error;
    }
  }

  /**
   * Valida la estructura del archivo Excel
   */
  validarEstructuraExcel(headers) {
    const norm = (v) => this.normalizarTexto(v);
    const hasAny = (synList) => headers.some(h => synList.some(s => norm(h).includes(this.normalizarTexto(s))));

    // Verificar headers básicos con sinónimos
    // 'grado' puede venir como contexto de bloque; no lo exigimos en headers
    if (!hasAny(this.colSyn.nombre)) {
      return { valida: false, error: 'Falta columna requerida: nombre (acepta: nombre, alumno, apellidos y nombres, ...)' };
    }
    if (!hasAny(this.colSyn.dni)) {
      return { valida: false, error: 'Falta columna requerida: DNI (acepta: dni, documento, nro documento, ...)' };
    }
    if (!hasAny(this.colSyn.matricula)) {
      return { valida: false, error: 'Falta columna requerida: matrícula (acepta: matricula, matrícula, monto matrícula, ...)' };
    }

    // Verificar al menos una pensión
    const tienePensiones = headers.some(h => 
      h && this.mesesPensiones.some(mes => 
        this.normalizarTexto(h).includes(this.normalizarTexto(mes))
      )
    );

    if (!tienePensiones) {
      return {
        valida: false,
        error: 'No se encontraron columnas de pensiones mensuales'
      };
    }

    return { valida: true };
  }

  /**
   * Procesa una fila individual de alumno
   */
  async procesarFilaAlumno(fila, headers, añoAcademico, resultados) {
    // Extraer datos básicos
    const grado = this.extraerValor(fila, headers, this.colSyn.grado);
    const nombre = this.extraerValor(fila, headers, this.colSyn.nombre);
    const dni = this.extraerValor(fila, headers, this.colSyn.dni);
    const matricula = this.extraerValor(fila, headers, this.colSyn.matricula);

    if (!nombre || !dni) {
      throw new Error('Faltan datos básicos del alumno (nombre, dni)');
    }

    // Buscar o crear grado (si no viene en columnas, usar contexto si fue detectado)
    const gradoNombre = grado || arguments[4] /* gradoContext */ || 'Sin grado';
    const gradoId = await this.obtenerOCrearGrado(gradoNombre);

    // Buscar o crear alumno
    const alumnoId = await this.obtenerOCrearAlumno(dni, nombre, gradoId, añoAcademico);

    // Registrar MATRÍCULA como DEUDA
    if (matricula && parseFloat(matricula) > 0) {
      await this.insertarDeuda(alumnoId, 'MAT', parseFloat(matricula), añoAcademico);
      resultados.pagosInsertados++;
      resultados.resumen.totalMatriculas++;
      resultados.resumen.montoTotalMatriculas += parseFloat(matricula);
    }

    // Registrar pensiones mensuales como DEUDA
    for (const mes of this.mesesPensiones) {
      const montoPension = this.extraerValor(fila, headers, mes);
      
      if (montoPension && parseFloat(montoPension) > 0) {
        const codigoPension = `PEN_${mes.toUpperCase().substring(0, 3)}`;
        await this.insertarDeuda(alumnoId, codigoPension, parseFloat(montoPension), añoAcademico);
        resultados.pagosInsertados++;
        resultados.resumen.totalPensiones++;
        resultados.resumen.montoTotalPensiones += parseFloat(montoPension);
      }
    }
  }

  /**
   * Extrae valor de una fila basado en el header
   */
  extraerValor(fila, headers, busqueda) {
    const norm = (v) => this.normalizarTexto(v);
    const isArray = Array.isArray(busqueda);
    const matches = (h) => {
      const lh = norm(h);
      if (isArray) return busqueda.some(b => lh.includes(norm(b)));
      return lh.includes(norm(busqueda));
    };
    const indice = headers.findIndex(h => h && matches(h));
    
    if (indice === -1) return null;
    
    const valor = fila[indice];
    if (valor === undefined || valor === null || valor === '') return null;
    
    // Limpiar valor
    return String(valor).trim();
  }

  /**
   * Obtiene o crea un grado académico
   */
  async obtenerOCrearGrado(nombreGrado) {
    // Normalizar nombre del grado
    const gradoNormalizado = this.normalizarGrado(nombreGrado);
    
    // Generar codigo determinístico a partir del nombre normalizado
    const codigo = this.generarCodigoGrado(gradoNormalizado);

    // Intentar encontrar por codigo primero
    const existentePorCodigo = await query(
      'SELECT id FROM grados WHERE codigo = $1',
      [codigo]
    );
    if (existentePorCodigo.rows.length > 0) {
      return existentePorCodigo.rows[0].id;
    }

    // Intentar encontrar por nombre similar
    const existentePorNombre = await query(
      'SELECT id FROM grados WHERE nombre ILIKE $1',
      [`%${gradoNormalizado}%`]
    );
    if (existentePorNombre.rows.length > 0) {
      return existentePorNombre.rows[0].id;
    }

    // Upsert por codigo para evitar colisiones de unicidad
    const nuevoGrado = await query(
      `INSERT INTO grados (codigo, nombre, nivel, orden)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [
        codigo,
        gradoNormalizado,
        this.determinarNivel(gradoNormalizado),
        await this.obtenerSiguienteOrden()
      ]
    );

    return nuevoGrado.rows[0].id;
  }

  /**
   * Normaliza el nombre del grado
   */
  normalizarGrado(grado) {
    // Remover sufijo de año al final del título (ej. " - 2025") por estética y para no duplicar por año
    const sinAnio = String(grado).replace(/\s*[-–—]\s*20\d{2}\s*$/i, '').trim();
    const gradoLower = sinAnio.toLowerCase();
    
    // Mapeo de grados comunes
    const mapeoGrados = {
      'inicial 3': 'Inicial 3 años',
      'inicial 4': 'Inicial 4 años', 
      'inicial 5': 'Inicial 5 años',
      '1er grado': 'Primer Grado',
      '2do grado': 'Segundo Grado',
      '3er grado': 'Tercer Grado',
      '4to grado': 'Cuarto Grado',
      '5to grado': 'Quinto Grado',
      '6to grado': 'Sexto Grado',
      '1er año': 'Primer Año',
      '2do año': 'Segundo Año',
      '3er año': 'Tercer Año',
      '4to año': 'Cuarto Año',
      '5to año': 'Quinto Año'
    };

    for (const [key, value] of Object.entries(mapeoGrados)) {
      if (gradoLower.includes(key)) {
        return value;
      }
    }

    return sinAnio;
  }

  /**
   * Determina el nivel educativo del grado
   */
  determinarNivel(grado) {
    const gradoLower = grado.toLowerCase();

    if (gradoLower.includes('inicial')) return 'Inicial';
    if (gradoLower.includes('secundaria')) return 'Secundaria';
    if (gradoLower.includes('grado')) return 'Primaria';
    if (gradoLower.includes('año')) return 'Secundaria';

    return 'Primaria'; // Por defecto
  }

  /**
   * Genera código para nuevo grado
   */
  generarCodigoGrado(grado) {
    const base = this.normalizarTexto(grado);
    const lower = base.toLowerCase();

    // Mapas conocidos
    if (lower.includes('inicial 3')) return 'I3';
    if (lower.includes('inicial 4')) return 'I4';
    if (lower.includes('inicial 5')) return 'I5';
    if (lower.includes('primer grado')) return 'P1';
    if (lower.includes('segundo grado')) return 'P2';
    if (lower.includes('tercer grado')) return 'P3';
    if (lower.includes('cuarto grado')) return 'P4';
    if (lower.includes('quinto grado')) return 'P5';
    if (lower.includes('sexto grado')) return 'P6';
    if (lower.includes('primer año')) return 'S1';
    if (lower.includes('segundo año')) return 'S2';
    if (lower.includes('tercer año')) return 'S3';
    if (lower.includes('cuarto año')) return 'S4';
    if (lower.includes('quinto año')) return 'S5';

    // Derivar código determinístico desde el nombre
    const letters = base.replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase();
    const hash = Math.abs(this._hashCode(base)).toString().slice(0,4);
    const prefix = letters.slice(0,3) || 'GRD';
    return `${prefix}${hash}`;
  }

  _hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0; // 32-bit
    }
    return h;
  }

  /**
   * Obtiene el siguiente orden para grados
   */
  async obtenerSiguienteOrden() {
    const resultado = await query('SELECT COALESCE(MAX(orden), 0) + 1 as siguiente FROM grados');
    return resultado.rows[0].siguiente;
  }

  /**
   * Obtiene o crea un alumno
   */
  async obtenerOCrearAlumno(dni, nombreCompleto, gradoId, añoAcademico) {
    // Buscar alumno existente
    const resultado = await query(
      'SELECT id FROM alumnos WHERE dni = $1 AND año_academico = $2',
      [dni, añoAcademico]
    );

    if (resultado.rows.length > 0) {
      return resultado.rows[0].id;
    }

    // Separar nombres y apellidos
    const partesNombre = nombreCompleto.split(' ');
    const nombres = partesNombre.slice(0, -2).join(' ');
    const apellidos = partesNombre.slice(-2).join(' ');

    // Crear nuevo alumno
    const nuevoAlumno = await query(
      `INSERT INTO alumnos (dni, nombres, apellidos, grado_id, año_academico) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [dni, nombres, apellidos, gradoId, añoAcademico]
    );

    return nuevoAlumno.rows[0].id;
  }

  /**
   * Inserta un pago en la base de datos
   */
  async insertarPago(alumnoId, codigoTipoPago, monto, añoAcademico) {
    // Obtener ID del tipo de pago
    const tipoPago = await query(
      'SELECT id FROM tipos_pago WHERE codigo = $1',
      [codigoTipoPago]
    );

    if (tipoPago.rows.length === 0) {
      throw new Error(`Tipo de pago no encontrado: ${codigoTipoPago}`);
    }

    // Insertar pago
    await query(
      `INSERT INTO pagos (alumno_id, tipo_pago_id, monto, fecha_pago, año_academico) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        alumnoId,
        tipoPago.rows[0].id,
        monto,
        moment().format('YYYY-MM-DD'),
        añoAcademico
      ]
    );
  }

  /**
   * Limpia datos anteriores del año académico
   */
  async limpiarDatosAnteriores(añoAcademico) {
    console.log(`🧹 Limpiando datos del año ${añoAcademico}...`);
    
    // No borrar pagos; solo deudas del año (Excel siembra deudas base)
    await query('DELETE FROM deudas WHERE año_academico = $1', [añoAcademico]);
    
    // Eliminar alumnos del año (opcional - comentado para preservar historial)
    // await query('DELETE FROM alumnos WHERE año_academico = $1', [añoAcademico]);
    
    console.log('✅ Datos anteriores limpiados');
  }

  /**
   * Registra el archivo procesado
   */
  async registrarArchivoProcesado(filePath, tipoArchivo, usuarioId, registrosProcesados, errores, añoAcademico) {
    const nombreArchivo = filePath.split('/').pop();
    // Verificar si existe la columna 'año' para evitar logs de error innecesarios
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

    // Mantener solo las últimas 3 versiones de Excel por año
    if (tipoArchivo === 'excel') {
      await query(
        `DELETE FROM archivos_subidos a
         WHERE a.tipo_archivo='excel' AND a.año_academico=$1
         AND a.id NOT IN (
           SELECT id FROM archivos_subidos
           WHERE tipo_archivo='excel' AND año_academico=$1
           ORDER BY created_at DESC NULLS LAST, id DESC
           LIMIT 3
         )`,
        [añoAcademico]
      );
    }
  }
}

module.exports = ExcelProcessor;
