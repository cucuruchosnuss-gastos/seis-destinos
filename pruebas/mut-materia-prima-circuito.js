// Mutaciones de test-materia-prima-circuito.js. Ver mutar.js.
//
//   node pruebas/mut-materia-prima-circuito.js

const path = require('path')
const { correrMutaciones } = require('./mutar')

const RAIZ = path.join(__dirname, '..')

correrMutaciones({
  suite: path.join(__dirname, 'test-materia-prima-circuito.js'),
  original: process.env.ARCHIVO_BASE || path.join(RAIZ, 'modulos/materia-prima.html'),
  funciones: ['htmlCircuitoDetalle', 'htmlPagadoSinIngresar', 'htmlResultadoCircuito', 'renderizarPagadoSinIngresar'],
  manuales: [
    { nombre: 'sin comprobante manda el importe en vez de null',
      de: "p_importe: tipoDoc === 'sin_comprobante' ? null : importe,", a: 'p_importe: importe,' },
    { nombre: 'el camino desde un gasto llama a registrar_factura_de_ingreso',
      de: '        if (gastoId) {\n          const { error } = await supabase.rpc(', a: '        if (false) {\n          const { error } = await supabase.rpc(' },
    { nombre: 'pasarAlCircuito deja escapar la excepción',
      de: '      } catch (e) {\n        return errorCircuito(e, !!gastoId)\n      }', a: '      } catch (e) {\n        throw e\n      }' },
    { nombre: 'el error de la RPC se tapa con un genérico',
      de: "          error?.message || 'No hubo respuesta de la base.',", a: "          'Ocurrió un error.'," },
    { nombre: 'el total se pide también con proveedor ocasional',
      de: '!w.desdeGasto && w.proveedorMatch?.cuenta_corriente === true', a: '!w.desdeGasto' },
    { nombre: 'el total se pide aunque venga de un gasto',
      de: "return esFactura(w.encabezado.tipoDoc) && !w.desdeGasto && w.proveedorMatch", a: "return esFactura(w.encabezado.tipoDoc) && w.proveedorMatch" },
    { nombre: 'validar deja pasar un total en cero',
      de: "if (!(n > 0)) return 'Cargá el total de la factura", a: "if (n == null) return 'Cargá el total de la factura" },
    { nombre: 'validar no exige el motivo de "no suma stock"',
      de: "if (m.length < 3) return 'Escribí por qué esta mercadería no suma stock.'", a: "if (m.length < 0) return 'Escribí por qué esta mercadería no suma stock.'" },
    { nombre: 'importe_cc null se muestra como $0',
      de: "const cc = importeConMoneda(data.importe_cc)", a: "const cc = '$' + Number(data.importe_cc).toLocaleString('es-AR')" },
    { nombre: 'vinculado_cc con importe distinto no avisa',
      de: 'if (!data.importe_distinto) return { nivel: \'ok\', lineas }', a: 'return { nivel: \'ok\', lineas }' },
    { nombre: 'el detalle ofrece reintento en ingresos anteriores al circuito',
      de: "!fechaInicio || String(c.fecha || '') < fechaInicio) continue", a: "!fechaInicio) continue" },
    { nombre: 'el detalle ofrece el botón sin permiso',
      de: '          ${puedeReintentar ? `<div class="circuito-mp__reintento">', a: '          ${true ? `<div class="circuito-mp__reintento">' },
    { nombre: 'un ocasional pide total en el reintento',
      de: "const pideTotal = conCc && c.tipo_doc !== 'sin_comprobante'", a: "const pideTotal = c.tipo_doc !== 'sin_comprobante'" },
    { nombre: 'el importe del OCR convierte null en 0',
      de: "      if (valor === '' || valor == null) return null\n      const n = Number(valor)", a: "      const n = Number(valor)" },
    { nombre: 'el descarte no recorta el motivo',
      de: "const motivo = (d.texto || '').trim()", a: "const motivo = (d.texto || '')" },
    { nombre: 'el error del descarte se tapa',
      de: '        d.error = error.message\n', a: "        d.error = 'Error'\n" },
    { nombre: 'la lista con error de la RPC se esconde',
      de: '      if (estado.errorPagadoSinIngresar) {\n        seccion.hidden = false', a: '      if (estado.errorPagadoSinIngresar) {\n        seccion.hidden = true' },
    { nombre: 'sin_stock_motivo se guarda también en remitos',
      de: 'return !!w && esFactura(w.encabezado?.tipoDoc) && !!w.sinStock', a: 'return !!w && !!w.sinStock' },
    { nombre: 'reiniciar la lectura pierde el gasto de origen',
      de: '      estado.wizard.desdeGasto = previo.desdeGasto\n', a: '' },
    { nombre: 'el circuito corre ANTES de insertar los ítems',
      de: '        const resultado = await pasarAlCircuito(ingresoId, circuito)\n', a: '' },
    { nombre: 'los datos del gasto pisan el número que leyó el OCR',
      de: "if (!valor || w.encabezado[clave]) return", a: "if (!valor) return" },
    { nombre: '?desde_gasto= no valida el uuid',
      de: "        mostrarError('El enlace no apunta a un gasto válido.')\n        return\n", a: '' },
  ],
})
