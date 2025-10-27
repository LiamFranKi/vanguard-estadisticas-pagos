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

      // Procesar cada deudor
      const resultados = {
        deudoresProcesados: 0,
        deudasInsertadas: 0,
        errores: [],
        resumen: {
          totalDeudores: deudores.length,
          totalDeuda: 0,
          deudasPorMes: {}
        }
      };

      // Limpiar deudas anteriores del día
      await this.limpiarDeudasDelDia(añoAcademico);

      for (const deudor of deudores) {
        try {
          await this.procesarDeudor(deudor, añoAcademico, resultados);
          resultados.deudoresProcesados++;
        } catch (error) {
          resultados.errores.push({
            deudor: deudor.nombre || 'Desconocido',
            error: error.message
          });
        }
      }

      // Registrar archivo procesado
      await this.registrarArchivoProcesado(
        filePath, 
        'pdf', 
        usuarioId, 
        resultados.deudoresProcesados,
        resultados.errores.length > 0 ? JSON.stringify(resultados.errores) : null
      );

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
    const deudores = [];
    const lineas = texto.split('\n').map(linea => linea.trim()).filter(linea => linea.length > 0);
    
    console.log('📄 Líneas encontradas:', lineas.length);

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];
      
      // Buscar patrones de alumno con deuda
      const patronAlumno = this.identificarPatronAlumno(linea);
      
      if (patronAlumno) {
        const deudor = {
          dni: patronAlumno.dni,
          nombre: patronAlumno.nombre,
          grado: patronAlumno.grado,
          mesesDeuda: patronAlumno.mesesDeuda || [],
          montoTotal: patronAlumno.montoTotal || 0
        };
        
        deudores.push(deudor);
        console.log('👤 Deudor encontrado:', deudor);
      }
    }

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
  async procesarDeudor(deudor, añoAcademico, resultados) {
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

    // Procesar cada mes de deuda
    for (const mes of deudor.mesesDeuda) {
      const codigoPension = `PEN_${mes.toUpperCase().substring(0, 3)}`;
      
      // Obtener tipo de pago
      const tipoPago = await query(
        'SELECT id FROM tipos_pago WHERE codigo = $1',
        [codigoPension]
      );

      if (tipoPago.rows.length === 0) {
        console.warn(`⚠️ Tipo de pago no encontrado: ${codigoPension}`);
        continue;
      }

      // Verificar si ya existe la deuda
      const deudaExistente = await query(
        `SELECT id FROM deudas 
         WHERE alumno_id = $1 AND tipo_pago_id = $2 AND fecha_reporte = $3`,
        [
          alumnoData.id,
          tipoPago.rows[0].id,
          moment().format('YYYY-MM-DD')
        ]
      );

      if (deudaExistente.rows.length > 0) {
        continue; // Ya existe la deuda para hoy
      }

      // Insertar deuda
      await query(
        `INSERT INTO deudas (alumno_id, tipo_pago_id, monto_deuda, fecha_reporte, año_academico) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          alumnoData.id,
          tipoPago.rows[0].id,
          deudor.montoTotal / deudor.mesesDeuda.length, // Monto por mes
          moment().format('YYYY-MM-DD'),
          añoAcademico
        ]
      );

      resultados.deudasInsertadas++;
      resultados.resumen.totalDeuda += deudor.montoTotal / deudor.mesesDeuda.length;
      
      // Contar por mes
      if (!resultados.resumen.deudasPorMes[mes]) {
        resultados.resumen.deudasPorMes[mes] = 0;
      }
      resultados.resumen.deudasPorMes[mes]++;
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
