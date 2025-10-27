const XLSX = require('xlsx');
const { query } = require('../utils/database');
const moment = require('moment');

class ExcelProcessor {
  constructor() {
    this.mesesPensiones = [
      'marzo', 'abril', 'mayo', 'junio', 
      'julio', 'agosto', 'setiembre', 
      'octubre', 'noviembre', 'diciembre'
    ];
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

      // Obtener headers (primera fila)
      const headers = data[0];
      console.log('📋 Headers encontrados:', headers);

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

      // Procesar cada fila (empezando desde la fila 2)
      for (let i = 1; i < data.length; i++) {
        const fila = data[i];
        
        if (fila.length === 0 || !fila[0]) continue; // Saltar filas vacías

        try {
          await this.procesarFilaAlumno(fila, headers, añoAcademico, resultados);
          resultados.alumnosProcesados++;
        } catch (error) {
          resultados.errores.push({
            fila: i + 1,
            error: error.message,
            datos: fila.slice(0, 5) // Primeros 5 campos para debug
          });
        }
      }

      // Registrar archivo procesado
      await this.registrarArchivoProcesado(
        filePath, 
        'excel', 
        usuarioId, 
        resultados.alumnosProcesados,
        resultados.errores.length > 0 ? JSON.stringify(resultados.errores) : null
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
    const headersEsperados = ['grado', 'nombre', 'dni', 'matricula'];
    
    // Verificar headers básicos
    for (const header of headersEsperados) {
      if (!headers.some(h => h && h.toLowerCase().includes(header))) {
        return {
          valida: false,
          error: `Falta columna requerida: ${header}`
        };
      }
    }

    // Verificar al menos una pensión
    const tienePensiones = headers.some(h => 
      h && this.mesesPensiones.some(mes => 
        h.toLowerCase().includes(mes)
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
    const grado = this.extraerValor(fila, headers, 'grado');
    const nombre = this.extraerValor(fila, headers, 'nombre');
    const dni = this.extraerValor(fila, headers, 'dni');
    const matricula = this.extraerValor(fila, headers, 'matricula');

    if (!grado || !nombre || !dni) {
      throw new Error('Faltan datos básicos del alumno (grado, nombre, dni)');
    }

    // Buscar o crear grado
    const gradoId = await this.obtenerOCrearGrado(grado);

    // Buscar o crear alumno
    const alumnoId = await this.obtenerOCrearAlumno(dni, nombre, gradoId, añoAcademico);

    // Procesar matrícula
    if (matricula && parseFloat(matricula) > 0) {
      await this.insertarPago(alumnoId, 'MAT', parseFloat(matricula), añoAcademico);
      resultados.pagosInsertados++;
      resultados.resumen.totalMatriculas++;
      resultados.resumen.montoTotalMatriculas += parseFloat(matricula);
    }

    // Procesar pensiones mensuales
    for (const mes of this.mesesPensiones) {
      const montoPension = this.extraerValor(fila, headers, mes);
      
      if (montoPension && parseFloat(montoPension) > 0) {
        const codigoPension = `PEN_${mes.toUpperCase().substring(0, 3)}`;
        await this.insertarPago(alumnoId, codigoPension, parseFloat(montoPension), añoAcademico);
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
    const indice = headers.findIndex(h => 
      h && h.toLowerCase().includes(busqueda.toLowerCase())
    );
    
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
    
    // Buscar grado existente
    const resultado = await query(
      'SELECT id FROM grados WHERE nombre ILIKE $1',
      [`%${gradoNormalizado}%`]
    );

    if (resultado.rows.length > 0) {
      return resultado.rows[0].id;
    }

    // Crear nuevo grado si no existe
    const nuevoGrado = await query(
      `INSERT INTO grados (codigo, nombre, nivel, orden) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        this.generarCodigoGrado(gradoNormalizado),
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
    const gradoLower = grado.toLowerCase();
    
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

    return grado;
  }

  /**
   * Determina el nivel educativo del grado
   */
  determinarNivel(grado) {
    const gradoLower = grado.toLowerCase();
    
    if (gradoLower.includes('inicial')) return 'Inicial';
    if (gradoLower.includes('grado')) return 'Primaria';
    if (gradoLower.includes('año')) return 'Secundaria';
    
    return 'Primaria'; // Por defecto
  }

  /**
   * Genera código para nuevo grado
   */
  generarCodigoGrado(grado) {
    const gradoLower = grado.toLowerCase();
    
    if (gradoLower.includes('inicial 3')) return 'I3';
    if (gradoLower.includes('inicial 4')) return 'I4';
    if (gradoLower.includes('inicial 5')) return 'I5';
    if (gradoLower.includes('primer grado')) return 'P1';
    if (gradoLower.includes('segundo grado')) return 'P2';
    if (gradoLower.includes('tercer grado')) return 'P3';
    if (gradoLower.includes('cuarto grado')) return 'P4';
    if (gradoLower.includes('quinto grado')) return 'P5';
    if (gradoLower.includes('sexto grado')) return 'P6';
    if (gradoLower.includes('primer año')) return 'S1';
    if (gradoLower.includes('segundo año')) return 'S2';
    if (gradoLower.includes('tercer año')) return 'S3';
    if (gradoLower.includes('cuarto año')) return 'S4';
    if (gradoLower.includes('quinto año')) return 'S5';
    
    return 'GEN';
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
    
    // Eliminar pagos anteriores
    await query('DELETE FROM pagos WHERE año_academico = $1', [añoAcademico]);
    
    // Eliminar deudas anteriores
    await query('DELETE FROM deudas WHERE año_academico = $1', [añoAcademico]);
    
    // Eliminar alumnos del año (opcional - comentado para preservar historial)
    // await query('DELETE FROM alumnos WHERE año_academico = $1', [añoAcademico]);
    
    console.log('✅ Datos anteriores limpiados');
  }

  /**
   * Registra el archivo procesado
   */
  async registrarArchivoProcesado(filePath, tipoArchivo, usuarioId, registrosProcesados, errores) {
    const nombreArchivo = filePath.split('/').pop();
    
    await query(
      `INSERT INTO archivos_subidos 
       (nombre_archivo, tipo_archivo, ruta_archivo, tamaño_archivo, usuario_id, registros_procesados, errores_procesamiento) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        nombreArchivo,
        tipoArchivo,
        filePath,
        0, // Tamaño se puede calcular después
        usuarioId,
        registrosProcesados,
        errores
      ]
    );
  }
}

module.exports = ExcelProcessor;
