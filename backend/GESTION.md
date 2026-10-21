# Finanzas, voluntarios y logística

Los roles existentes `jefe_finanzas`, `voluntario` y `jefe_logistica` ingresan a
`/finanzas`, `/voluntario` y `/logistica`. Comparten el layout de presidencia.
Presidencia tiene nuevas opciones para revisar caja y autorizar fondos y préstamos.
La asignación de roles sigue realizándose desde la administración de usuarios.

## Instalación

1. Actualizar backend y compilar el frontend con `npm run build`.
2. Desde `backend`, ejecutar `npm run migrate:gestion` contra la base configurada
   en `.env`, o ejecutar `scripts/18_finanzas_logistica.sql` y luego (una sola vez)
   `scripts/19_finanzas_comprobantes.sql`, `20_finanzas_mensualidades.sql`, `21_finanzas_deudas_conceptos.sql` y
   `22_logistica_actas_tipos.sql`, `23_personal_gestion.sql` y `24_personal_reglamento.sql`
   (en ese orden) seleccionando esa base.
   La inicialización del módulo también aplica ambos scripts de manera idempotente.
   No se cambian saldos ni registros previos. Requiere las tablas existentes de
   usuarios, campañas, operaciones, personal y documentos de presidencia.
3. Reiniciar el backend para cargar rutas y el procesador de notificaciones.
4. Verificar cuentas activas de presidencia, finanzas y logística con correos correctos.

La caja empieza sin movimientos. Finanzas debe registrar el saldo inicial y su
referencia. Las donaciones públicas y las cuotas personales existentes son otros
registros: no se importan automáticamente a la caja para evitar duplicidades.

## Fondos

Solicitud → autorización de finanzas → autorización de presidencia → confirmación
de desembolso/recepción por finanzas. Solo entonces se genera un movimiento y su
comprobante. Las aprobaciones corresponden a dos usuarios distintos.

## Vouchers

Todo ingreso, egreso y reserva recibe un número correlativo único `FIN001`, `FIN002`…
(una sola secuencia, `gestion_control.fin_correlativo`). Se asigna dentro de la
transacción bloqueada: una operación rechazada no consume número ni deja huecos.
Al aplicar el script 19, los registros previos se numeran en orden cronológico.

Cada voucher se consulta en `/…/voucher/FINnnn` (vista digital) y se descarga en PDF
(jsPDF, membrete editable de presidencia). El egreso de una solicitud incluye al
voluntario (nombre completo, C.I., grado), la fecha, el motivo, las autorizaciones de
finanzas y presidencia con fecha y hora, el desembolso y tres líneas de firma. Los
voluntarios solo ven los vouchers de sus solicitudes y mensualidades; los de reservas son internos.

Los destinos de reserva (`fin_destinos`) los administra finanzas: puede agregar destinos,
indicar si exigen una campaña y desactivarlos sin perder las reservas existentes.

## Conceptos, deudas y reporte Excel

Cada movimiento tiene un concepto (`fin_movimientos.concepto`). Finanzas lo elige en
ingresos y egresos directos (donación, combustible…); el sistema lo asigna en
solicitudes, mensualidades, préstamos recibidos y pagos de deuda. El script 21 asigna
el concepto de su origen a los movimientos previos ("Otros" si no tienen origen).

`fin_deudas` registra préstamos recibidos, deudas con proveedores y otras. Un préstamo
puede ingresar a caja con su voucher de ingreso. Al registrar un egreso se puede elegir
la deuda a cubrir: el abono no puede superar el saldo pendiente y el voucher muestra el
saldo antes y después del pago. El saldo no se almacena (monto − egresos vinculados).

El Excel de «Estado financiero» se arma en el navegador (exceljs) con
`GET /gestion/reportes/finanzas?desde&hasta`: resumen, ingresos, egresos, totales por
concepto, préstamos y deudas con sus pagos, mensualidades cobradas y estado actual de
mensualidades por voluntario.

## Mensualidades

Finanzas define tarifas vigentes desde un mes (`AAAA-MM`) con su día de vencimiento
(1 a 28); monto 0 suspende el cobro. Una tarifa retroactiva solo se acepta si no hay
pagos afectados. Se cobra a los voluntarios con estado de personal activo o pasivo (no a los
dados de baja, cooperadores ni en comisión) y con cuenta habilitada, desde su mes de
registro o el inicio que fije finanzas, salvo los meses con exención (licencia, beca).

La deuda no se almacena: se calcula con tarifas, inicio, exenciones y pagos. Un mes
queda vencido después de su día de vencimiento. El cobro se hace en orden (primero lo
más antiguo, hasta 11 meses de adelanto), registra un ingreso con voucher FIN y un pago
por mes (`fin_mensualidad_pagos`, único por voluntario y mes), y notifica por correo.
El PDF del voucher trae original para finanzas y copia para el voluntario.
El voluntario consulta su estado en `/voluntario/mensualidades`.

Los egresos aprobados por finanzas comprometen saldo hasta su ejecución o rechazo.
Disponible = ingresos − egresos − reservas activas − solicitudes comprometidas.
Las reservas para campañas requieren una campaña existente. Para utilizar fondos
reservados se libera primero la reserva con un motivo y se registra el gasto.
Los movimientos son permanentes: una corrección se registra como movimiento
compensatorio con referencia al original, conservando su auditoría.

Cada mutación de gestión exige `Idempotency-Key`; la misma clave y contenido
devuelven el resultado anterior, y contenido distinto con esa clave se rechaza.
La transacción bloquea una fila común, evitando sobregiros y asignaciones concurrentes.
Los voluntarios solo consultan sus solicitudes, vouchers, equipos y actividades.

## Equipos

Cada unidad física tiene un código único y un estado inicial. Solo equipos buenos
o regulares se prestan. La solicitud bloquea el equipo hasta la decisión presidencial;
la autorización lo asigna al file del voluntario. Una devolución registra quién
recibió, cuándo, estado y observaciones. Un equipo con préstamo pendiente o activo
no puede darse de baja. La baja conserva el historial y no se revierte desde este módulo.
Las solicitudes vencidas se rechazan y se crea otra con la nueva fecha.

### Tipos de equipo y actas LOG

`log_tipos` es el catálogo de tipos de equipo (se agregan y desactivan desde Inventario;
un tipo inactivo conserva sus equipos). `log_equipos.tipo` referencia el nombre del tipo.
Los tipos escritos antes del script 22 pasan al catálogo automáticamente.

Cada entrega (autorización presidencial del préstamo), devolución y baja emite un acta
correlativa `LOG001`, `LOG002`… (`log_actas`, una entrega y una devolución por préstamo).
El número se asigna dentro de la transacción bloqueada, sin huecos. El acta digital se
consulta en `/…/acta/LOGnnn` y su PDF incluye original para logística y copia para el
voluntario (la de baja, una sola hoja). El voluntario solo ve las actas de sus préstamos.
Al aplicar el script 22, las entregas, devoluciones y bajas previas se numeran en orden.

El Excel del dashboard de logística (`GET /gestion/reportes/logistica?desde&hasta`) trae
resumen, inventario, préstamos, vencidos, actas y equipos por voluntario.

## Personal

El rol `jefe_personal` ingresa a `/personal` (mismo layout de gestión; presidencia también
puede usar estas rutas `/gestion/personal/*`). Funciones:

- **Alta y edición**: el alta crea el usuario con rol voluntario y asigna la matrícula
  correlativa de su código (`VF-`, `VC-`, `VR-` + número de 3 dígitos, la misma regla
  de la administración de usuarios) dentro de la transacción bloqueada. Cambiar de
  código asigna la siguiente matrícula de la nueva serie. Cada edición guarda el
  detalle «antes → después».
- **Estado**: activo, pasivo, cooperador o baja, con motivo. La comisión tiene su
  propio flujo (`per_comisiones`): guarda el estado previo y lo restaura al finalizar.
  El script 23 abre una comisión activa para quienes ya figuraban «en comisión».
- **Llamadas de atención** (`per_llamadas`): memorándum correlativo `LLA001…`, con
  PDF (original para personal y copia para el voluntario), notificación por correo y
  descuento opcional de puntos.
- **Asistencia**: llamar lista al personal activo y en comisión (un registro por
  persona y día en `instruccion_asistencia`), corrección individual con motivo, lista
  en PDF y reporte por persona/día con Excel. Asistencia efectiva =
  (presente + tarde) / (presente + tarde + falta).
- **File**: datos, matrícula, estado y comisiones, méritos/deméritos, llamadas,
  asistencia, documentos (carnet, certificado médico, etc.), certificados CRTYA
  (vinculados por C.I. o nombre), capacitaciones, resoluciones, equipos y bitácora.
- **Reglamento disciplinario** (`per_reglamento`, script 24): artículos de méritos y
  deméritos con código, gravedad, puntos y sanción, administrados por la jefatura.
  Viene precargado con los ítems disciplinarios del RO-001/25. Todo mérito o demérito
  cita un artículo y toma sus puntos (`meritos.reglamento_id`); una llamada de atención
  puede citar una falta y entonces su gravedad y puntos salen del artículo. Editar un
  artículo no altera los registros anteriores.
- **Visor**: los documentos del file (PDF e imágenes) se ven dentro del sistema.
- **File del voluntario**: `/voluntario/file` (`GET /gestion/mi-file-completo`) muestra
  su file completo en modo lectura, sin la bitácora interna, y sus memorándums LLA.
- **Bitácora**: todo cambio se escribe en `voluntario_log` (la misma que muestra
  presidencia) con quién lo hizo, además de la auditoría en `gestion_eventos`.

## Correo y recordatorios

Las notificaciones se insertan en `gestion_correos` dentro de la transacción de
negocio. Se generan correos individuales al departamento, presidencia y solicitante
o voluntario; se deduplican direcciones. Debe existir al menos una cuenta activa
de cada jefatura destinataria para recibir su aviso.

Variables: `SMTP_USER`, `SMTP_PASS`; opcionales `SMTP_HOST`, `SMTP_PORT` (587),
`SMTP_SECURE` (`true` para TLS implícito), `PRESTAMOS_AVISO_DIAS` (3 por defecto).
Sin host se utiliza Gmail, como en el sistema existente. Nunca se registran credenciales.

El backend procesa la cola cada minuto. Sin SMTP configurado, los mensajes siguen
pendientes. Los fallos se reintentan con espera creciente hasta un máximo de seis
horas entre intentos. Las pantallas de notificaciones permiten ver pendientes,
intentos y entrega a SMTP; esta entrega no confirma lectura ni entrega en la bandeja.
No se requiere una sesión abierta, pero sí el proceso del backend activo.

Se envía un aviso al aproximarse la devolución y otro al vencer, usando la fecha
de Bolivia. La clave del evento impide repetir el recordatorio en cada ciclo.
SMTP ofrece entrega al menos una vez: un corte entre el envío y la confirmación
en la base podría repetir un mensaje. No se duplican movimientos monetarios.

## Pruebas locales

`npm run test:gestion` ejecuta validaciones sin base de datos. Para la integración,
en PowerShell: `$env:GESTION_TEST_LOCAL='1'` y luego `npm run test:gestion`.
Solo admite un MySQL/MariaDB local. Crea una base temporal `gestion_test_*`, copia
estructuras (sin datos), usa destinatarios `example.invalid` y un transporte de
correo simulado, y elimina únicamente su base de pruebas al terminar.

Comprueba roles, saldo concurrente, idempotencia, reservas, doble autorización,
voucher privado, préstamos, devoluciones, bajas, recordatorios, fallos y reintentos,
actividad propia y validación de operaciones sin duplicar puntos.
