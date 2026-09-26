// Mutaciones de test-produccion-fabrica-pruebas.js: cada una saca UNA llamada
// al filtro de la fábrica de pruebas (o su cableado) y la suite tiene que
// ponerse en rojo. Ver mutar.js y mutar-produccion.js.
//
//   node pruebas/mut-produccion-fabrica-pruebas.js
//
// UN RUNNER POR VEZ: dos corridas en paralelo se pisan el mut-tmp-*.html.

const path = require('path')
const { correrMutacionesProduccion } = require('./mutar-produccion')

correrMutacionesProduccion({
  suite: path.join(__dirname, 'test-produccion-fabrica-pruebas.js'),
  funciones: [],
  manuales: [
    // Los dos helpers (cada archivo tiene su copia)
    { nombre: 'las unidades sin filtrar', archivo: 'ambos',
      de: '      return new Map(sinUnidadesDePrueba(filas ?? [], fabrica).map(u => [u.id, u.nombre]))',
      a: '      return new Map((filas ?? []).map(u => [u.id, u.nombre]))' },
    { nombre: 'el personal sin filtrar', archivo: 'ambos',
      de: '      return sinPersonasDePrueba(filas ?? [], estado.fabrica)',
      a: '      return filas ?? []' },
    // El cableado de las unidades
    { nombre: 'cargarPermisos no espera la fábrica', archivo: 'ambos',
      de: '      estado.fabrica = await pFabrica\n', a: '' },
    { nombre: 'cargarPermisos arma el mapa sin el filtro', archivo: 'ambos',
      de: '      estado.unidades = mapaDeUnidades(unidades, estado.fabrica)',
      a: '      estado.unidades = new Map((unidades ?? []).map(u => [u.id, u.nombre]))' },
    { nombre: 'el init no le pasa la fábrica a cargarPermisos', archivo: 'ambos',
      de: '        await cargarPermisos(pFabrica)', a: '        await cargarPermisos()' },
    // La planta: los dos lugares donde se pide el personal
    { nombre: '"¿Quién sos?" con los robots',
      de: "        estado.personal = personalSinPruebas(data)\n      } catch (err) {\n        console.error('personal_produccion:', err)",
      a: "        estado.personal = data ?? []\n      } catch (err) {\n        console.error('personal_produccion:', err)" },
    { nombre: 'el acceso maestro con los robots',
      de: "          estado.personal = personalSinPruebas(data)\n        } catch (err) {\n          console.error('personal_produccion (maestro):', err)",
      a: "          estado.personal = data ?? []\n        } catch (err) {\n          console.error('personal_produccion (maestro):', err)" },
    // La gestión: Personal y PINes, y los accesos temporales
    { nombre: 'Personal y PINes con los robots',
      de: '      return { personal: personalSinPruebas(data), temporales, nombres }',
      a: '      return { personal: data ?? [], temporales, nombres }' },
    { nombre: 'los accesos temporales con los robots',
      de: '      const temporales = sinPersonasDePrueba((t.data ?? []).filter(x => temporalVigente(x)), estado.fabrica, x => x.empleado_id)',
      a: '      const temporales = (t.data ?? []).filter(x => temporalVigente(x))' },
  ],
})
