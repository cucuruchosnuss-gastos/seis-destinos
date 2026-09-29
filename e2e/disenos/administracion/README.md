# Handoff: Administración

## Overview
Rediseño de Administración, el lugar donde está la plata. La usan Facu, Pablo y Yanina desde la compu. **Cada sección se ve solo con su permiso**: si alguien no tiene permiso para una sección, no ve ni la pestaña ni la tarjeta de la portada.

Usa el sistema de `design_handoff_esqueleto_gestion`: Bricolage Grotesque y Figtree, grises cálidos, fondo `#F5F3EF`, la barra lateral y la barra de fábricas. El color del módulo es el uva `oklch(0.45 0.14 305)`. Las órdenes que carga el depósito vienen de `design_handoff_ordenes_retiro`.

## About the design files
`Administracion.dc.html` es una referencia de diseño en HTML, no código de producción. Tiene 15 pantallas de compu (1a–9b) a 1366 × 768 y 2 de celular (10a–10b) a 390 × 844.

## Fidelity
Alta fidelidad. Datos realistas y cuentas que cierran: los saldos, totales y aumentos están calculados.

---

## Estructura común (compu)
- Esqueleto: barra lateral (Administración activa) y barra de arriba con la fábrica (Nuss elegida).
- **Encabezado del módulo**: ícono, "Administración" y las **pestañas de sección** en un segmentado (30 px): Inicio · Cobranzas · Órdenes · Por revisar · Clientes · Listas de precios · Importar · Cheques · Seguridad · Errores. Cada pestaña lleva su burbuja: bordó si es urgente, gris si no.
- **Contenido**: `padding 12px 24px 18px`, bloques blancos de radio 16 y sin scroll de página. Scrollean solo las tablas, dentro de su recuadro.
- Tablas: encabezado de 30 px (11.5/800 mayúsculas `#9A9287`) y filas de 38–58 px. Los importes van alineados a la derecha, con `tabular-nums`. La fila elegida lleva fondo `#FDEEE4` y un borde naranja de 3 px a la izquierda. Las filas con problema llevan fondo `#FBF1F4` y borde bordó.
- **Plata**: `$ 1.234.567`, siempre con punto de miles. Lo que entra (haber) va en verde `#205B39`; lo que falta o se pasa, en bordó.

---

## Pantallas

### 1a · Portada
- **Accesos directos** arriba: Cheques, Cobranzas, Cuentas corrientes, Gastos y Caja, cada uno con el ícono y el color de su módulo.
- Grilla de 3 × 3 tarjetas, una por sección, con **el número pendiente grande** (Bricolage 40) y dos o tres renglones de contexto. El número va en bordó cuando es urgente.

| Sección | Número | Contexto |
|---|---|---|
| Cobranzas por asentar | 5 | $ 1.742.000 · la más vieja · Ir a asentar |
| Órdenes de retiro | 4 sin valorizar | 1 con faltante · las del mes |
| Retiros por revisar | 2 | qué se llevó cada uno |
| Clientes | 55 activos | 2 pasados de su límite (bordó) · lo que nos deben |
| Listas de precios | 3 | cuáles · último aumento |
| Importar | — nada pendiente | la última importación |
| Cheques | 12 en cartera | $ y plazo · 3 vencen esta semana |
| Seguridad | 21 sesiones abiertas | cerradas por otra persona hoy |
| Errores de la app | 3 en 7 días | 1 nuevo · **solo super_admin** |

- Tocar una tarjeta abre su sección.

### 2 · Cobranzas por asentar
- **Lista** (380 px): lo que escribió el chofer, **tal cual y en cursiva** ("“Caserato”"), quién la cargó y cuándo, el total y cómo pagaron.
- **Detalle**:
  - Efectivo, cheques y total en grande. Los **cheques con su foto** (placeholder de 92 × 54), banco, número, fecha de cobro e importe.
  - **¿De qué cliente es?**: primero los **sugeridos**. El sistema aprende cómo escribe cada chofer: "Ramón escribió “Caserato” 14 veces para este cliente". Si no es ninguno, hay un buscador.
  - **Antes de confirmar**: "Se descuenta de la cuenta de Caserato Helados SA en Nuss · Debe $ 4.120.000 → le queda $ 3.634.000".
  - **Asentar $ 486.000**.
- **2b · Cliente del Taller**: aparece **¿A qué proyecto va la plata?**, con los proyectos del cliente y lo que falta cobrar de cada uno, más "A cuenta, sin proyecto". El resumen dice cuánto le queda por cobrar al proyecto.
- **Después de asentar**, una franja verde arriba dice en qué cuenta se descontó y cuánto queda, con "Ver la cuenta".

### 3 · Órdenes de retiro
- **Lista**: todas las órdenes de la fábrica, con los filtros Todas / Sin valorizar / Valorizadas / Anuladas. "**Sin valorizar**" va en pastilla bordó. La que tiene faltante dice "con faltante · por revisar". Las anuladas van tachadas.
- **3a · Valorizar**:
  - Tabla Producto · Cajas · **Precio × caja (campo)** · Subtotal. Los precios salen de la **lista del cliente** vigente el día del retiro y se pueden corregir renglón por renglón. Un precio corregido lleva borde naranja y "lista $ 38.400 · corregido".
  - **Total** al pie.
  - **Aviso de límite de crédito** en bordó: "Límite $ 3.000.000 · hoy debe $ 2.860.000 · quedaría en $ 4.344.000". Avisa pero **no bloquea**.
  - Acciones: Anular… (texto bordó) · Imprimir con precios · Enviar · **Guardar valorización**.
- **3b · Corregir y anular**:
  - Una orden valorizada muestra sus precios y ofrece **Corregir valorización**.
  - **Anular** abre una ventana: motivo rápido (El cliente devolvió todo / Se cargó dos veces / Otro motivo), **motivo escrito obligatorio** y el aviso "La orden queda tachada y la hoja sale con el sello ANULADA". El botón es bordó.
- Imprimir y Enviar desde acá sacan la hoja **con precios**: la misma hoja del depósito, con columnas de precio y subtotal.

### 4a · Retiros por revisar
- Una tarjeta por retiro: orden, cliente, quién la cargó, producto, **se llevó / había / faltante** (el faltante en bordó).
- **Aceptar pide el motivo**: "Se compró y no se cargó el ingreso", "Hubo un error en el recuento" u "Otro motivo", más un detalle opcional.
- Las que no están abiertas muestran "Revisar". Abajo, **lo aceptado este mes**, con el motivo y quién lo aceptó.

### 5 · Clientes
- **5a · Lista** (55 en Nuss):
  - Columnas: Cliente (con razón social) · **Código viejo** · Lista · Retiros del mes · **Saldo** · Límite · marcas · **Activo** (interruptor).
  - Marcas: "pasado de su límite" (bordó, con la fila tintada) y "también proveedor".
  - El buscador busca por nombre, razón social, apodo o código viejo. **Mostrar apagados**, Importar y + Nuevo cliente.
- **5b · Cuenta corriente**:
  - Cabecera con saldo, límite, plazo y retiros del mes, más **Ajuste con motivo**.
  - Tabla Fecha · Detalle · Debe · Haber · **Saldo acumulado**. El detalle usa el código de la orden ("N-0008 · Orden de retiro") o "Cobranza del 12/09".
  - El **saldo inicial** va arriba, marcado: se carga una sola vez.
  - Una orden **sin valorizar todavía no suma** y lo dice.
- **5c · Ficha**: seis bloques, cada uno con su **Editar**:
  - **Datos**: nombre, razón social, CUIT, condición IVA.
  - **Dirección**.
  - **Contacto**, con los apodos que usan los choferes.
  - **Banco**: CBU y alias.
  - **Comercial**: lista, límite, plazo, **el proveedor que es el mismo tercero** (link a Cuentas corrientes) y el **saldo inicial** ("ya cargado · no se puede volver a cargar").
  - **Observaciones**.

### 6 · Listas de precios
- **6a**:
  - A la izquierda, las listas de la fábrica con cuántos clientes tiene cada una.
  - En el centro, la grilla: producto terminado sin cono, con cono, y **materia prima e insumos**, cada uno con precio vigente y desde cuándo.
  - A la derecha, el **historial** del producto elegido: fecha, precio, cambio y quién.
  - **Editar desde una fecha** guarda una **versión nueva**. Las órdenes viejas mantienen el precio de su día.
- **6b · Aumentar todo un %**:
  - Porcentaje, desde qué fecha y redondeo.
  - Tabla Ahora · Desde 01/10 · Cambio, calculada.
  - Aviso naranja suave: "**Todavía no se guardó nada**".
  - Recién **Confirmar aumento · 11 precios** guarda.

### 7a · Importar desde Excel
- Cuatro pasos: Qué importás (clientes, precios o saldos iniciales) · La plantilla (**descargable**) · Subir el Excel · Revisar y guardar.
- **Vista previa fila por fila**: cada error va en bordó, en la celda que falla y explicado en la columna Estado. Ejemplos: "CUIT inválido: tiene 8 números", "CBU corto: tiene 17 números, lleva 22", "Nombre repetido: “Caserato” ya existe".
- Filtro "Solo con error".
- **Guardar solo las 46 filas buenas**.

### 8a · Seguridad y errores
- **Sesiones cerradas**: quién cerró las sesiones de quién, cuándo y con qué motivo.
- **Errores de la app** (etiqueta "Solo super_admin"): qué falló, dónde, cuántas veces, la última vez y si es Nuevo (bordó) o Visto.

### 9 · Estados
- **9a · Cargando y error**: cada tarjeta de la portada carga sola. Mientras carga, muestra barras grises. Si falla: "No se pudo cargar · Puede ser la conexión. El resto anda bien." + **Reintentar**.
- **9b · Sin datos**: "No hay cobranzas por asentar", en verde, con la hora de la última que se asentó.
- **Pendiente / urgente**: en todo el módulo, en bordó.

### 10 · Celular
- **10a · Portada**: las mismas tarjetas, en una columna.
- **10b · Asentar**: la cobranza apilada, con la foto del cheque, los sugeridos, el resumen y el botón a todo el ancho.
- Barra inferior del esqueleto con Administración activa.

---

## Reglas
- Sin azules. **Naranja** para lo que se toca y lo elegido; **verde** para lo que entra y "está bien"; **bordó** para lo urgente, lo que se pasa o está mal, y para Anular.
- Todo lo que mueve plata muestra **antes de confirmar** qué va a pasar (cuenta, saldo antes y después).
- Castellano rioplatense, sin "usted".

## Decisiones para confirmar
1. El aviso de límite de crédito avisa pero no bloquea la valorización.
2. La hoja con precios es la misma del depósito, con dos columnas más.
3. Los sugeridos de Cobranzas se ordenan por cuántas veces ese chofer escribió eso para ese cliente.

## Files
- `Administracion.dc.html` · `logo.png` · `support.js`
