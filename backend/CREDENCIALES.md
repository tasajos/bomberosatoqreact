# Credenciales de voluntarios

Presidencia → Credenciales lista los voluntarios y el historial de sus emisiones.
Cada credencial usa los datos vigentes del file, una foto de frente, una función
institucional y una fecha de emisión. Sangre y código/matrícula son obligatorios.
Las especialidades se incluyen cuando están registradas en el file; se admiten
varias separadas por comas, punto y coma o saltos de línea. Si no tiene ninguna,
el bloque se omite en la credencial y su ficha pública. La foto se centra en
formato vertical; se muestra antes de emitir.

## Publicación

Actualizar backend y frontend, ejecutar `npm run migrate:credenciales` desde
`backend` y reiniciar el backend. La inicialización también crea las tablas de
forma idempotente. Conservar `backend/storage/credenciales` en un almacenamiento
persistente junto con las copias de seguridad de la base.

Configurar `SITE_URL=https://bomberosatoq.org` con el origen público real. El QR
se genera con ese origen (por defecto https://bomberosatoq.org), incluso si se
emite desde un equipo local. Las rutas públicas son
`/credenciales/verificar/:token` en el frontend y
`/api/credenciales/publico/:token` en el backend. El alojamiento del frontend debe
redirigir estas rutas a su `index.html`, como las de certificados. La ficha abre
sin sesión desde cualquier dispositivo con Internet una vez desplegado el cambio.

## Impresión y vigencia

PDF de dos páginas: frente y reverso, ambas verticales. Tamaño de corte:
54 × 85,6 mm; tamaño total de página: 60 × 91,6 mm. Incluye sangrado de 3 mm,
TrimBox, BleedBox y marcas de corte. Entregar el PDF original a la imprenta,
al 100 % de escala. Ajustar la perforación y acabado con la imprenta.

La cabecera contiene el nombre legal completo de la fundación y el pie
«Bomberos Voluntarios». Las insignias se vinculan al catálogo institucional de
Fuego, Soporte Vital, Búsqueda y Rescate, Guardianes de la Naturaleza, Ciencia e
Investigación y Administración. Se reconocen denominaciones como USAR, primeros
auxilios e incendios forestales. Las especialidades sin insignia reconocida se
conservan en texto; no se asigna un logo de otra unidad. El diseño actualizado se
aplica a nuevas emisiones y se actualiza al descargar emisiones anteriores,
conservando sus datos, código y QR.

La fecha de vencimiento es el mismo día del año siguiente; para un 29 de febrero,
se usa el 28 de febrero. La credencial vence al terminar esa fecha en Bolivia.
La ficha también informa cuando el voluntario está inactivo, la credencial fue
anulada o fue reemplazada por una nueva. Renovar no cambia el QR anterior.

La emisión guarda una copia de los datos y del PDF. Los cambios posteriores al
file no alteran una credencial emitida: se crea una nueva para actualizarla.
Si se interrumpe la generación, «Completar emisión» retoma el registro pendiente.
Las solicitudes se deduplican y solo una emisión puede quedar pendiente por titular.

La ficha pública expone nombre, foto, matrícula/código institucional, sangre,
grado, función, especialidad, fechas y estado. No incluye CI, domicilio, teléfono,
correo ni el resto del file personal. Los tokens son aleatorios de 256 bits y las
respuestas públicas llevan noindex y no-store. El PDF original requiere acceso
de presidencia o administración; el rol se vuelve a consultar en la base.

## Pruebas

Backend: `$env:GESTION_TEST_LOCAL='1'; npm run test:credenciales` en PowerShell.
Solo permite MySQL/MariaDB local y usa una base temporal independiente.
Frontend: `npm run test:credenciales` y `npm run build`.
El test del PDF genera un ejemplo con información y fotografía ficticias en
`output/pdf/credencial_ejemplo.pdf`; se comprobó su QR leyendo el PDF renderizado.

El código de emisión CREDYA se muestra en el sistema, no se imprime en la tarjeta.
La matrícula/código institucional del voluntario permanece visible. La descarga
reutiliza el registro y su QR. Las emisiones con diseño anterior se actualizan al
descargarlas conservando código, titular, fechas y estado; las siguientes descargas
usan el PDF guardado. La migración 28 registra esa versión de diseño. «Renovar
credencial» es una acción explícita distinta que crea una nueva emisión.

El filtro del listado y el historial usa `estado_personal`: activo, pasiva
(mostrado como Pasivo), baja, cooperador y comisión. Es independiente de `activo`,
que controla el acceso al sistema.
