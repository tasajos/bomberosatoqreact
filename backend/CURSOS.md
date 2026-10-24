Cursos online
=============

Presidencia crea los cursos en Presidente > Formación > Cursos online. Cada curso
tiene título, descripción, instructor, horas académicas, fechas de inicio y fin,
costo (0 = gratuito), cupo, nota mínima de aprobación (51 % por defecto) y a quién
está dirigido:

- Interno: solo miembros de la fundación (sesión institucional).
- Público: miembros y personas externas registradas.

Estados: Borrador (el instructor prepara el contenido; los participantes no lo
ven), Publicado (abierto a inscripción), Finalizado (cierra exámenes y habilita
la certificación) y Cancelado. Un curso con inscritos no se elimina: se cancela.

Instructor
----------

- Miembro de la fundación: entra con sus credenciales y en su portal aparece
  "Cursos para dictar" (solo si dicta algún curso).
- Externo: Presidencia lo registra desde el formulario del curso. Se genera una
  contraseña temporal que se muestra una vez y se envía por correo si SMTP está
  configurado. El instructor entra en /cursos/ingresar y ve "Cursos que dicto".
  "Generar nueva contraseña" reemplaza la anterior.

El instructor (y Presidencia) organiza el contenido por módulos: PDF,
presentaciones (PPT/PPTX/PPS/PPSX/ODP), videos (MP4/WebM/OGV/MOV), prácticas HTML
y enlaces (YouTube, Vimeo y Google Drive se muestran embebidos). Cada módulo
puede tener un examen y el curso un examen final, con preguntas de respuesta
única o múltiple, puntos por pregunta e intentos permitidos.

Participantes
-------------

Presidencia dispone de Personas > Usuarios externos para consultar todas las
cuentas, incluidas las pendientes de confirmar y las que no tienen inscripción.
La lista permite buscar por nombre, correo, documento, teléfono o institución y
se actualiza cada 30 segundos mientras está visible. También se accede desde
Cursos online.

Eliminar una cuenta requiere confirmación y libera su correo para registrarse
de nuevo. Se eliminan sus inscripciones, intentos y progreso, y sus sesiones y
enlaces de confirmación anteriores dejan de funcionar. Los certificados ya
emitidos se conservan en el módulo de certificados. Para eliminar un instructor
con cursos asignados, primero debe reemplazarse desde la edición de esos cursos.
Estas operaciones utilizan las rutas protegidas GET /api/cursos/gestion/cuentas
y DELETE /api/cursos/gestion/cuentas/:id; no requieren migraciones adicionales.

- Miembros: opción "Cursos online" en su portal (voluntario, finanzas,
  personal, logística, operaciones).
- Externos: llenan el pre-registro en /cursos/registro (página pública /cursos,
  enlace "Cursos" del menú del sitio). Reciben un correo con un enlace para
  confirmar su dirección (vence en 48 horas y se puede reenviar desde Ingresar).
  Sin confirmar no pueden ingresar. Al confirmar, la cuenta se activa, se inicia
  su sesión y Presidencia recibe el aviso "Nuevo participante externo". Luego
  acceden solo al portal de cursos /cursos/aula.

Habilitación: toda inscripción (interna o externa, gratuita o con costo) queda
"Por habilitar" y Presidencia recibe el correo "Solicitud de inscripción".
Presidencia la habilita o rechaza en la pestaña Participantes del curso; una
cuenta externa solo puede habilitarse con el correo confirmado. El cupo se
controla al habilitar. El participante recibe un correo cuando su inscripción es
habilitada, rechazada (con el motivo) o dada de baja. Si el curso tiene costo,
mientras espera puede registrar la referencia de su pago para que Presidencia la
verifique. El contenido se habilita desde la fecha de inicio; los exámenes se
rinden entre las fechas del curso mientras esté Publicado.

La habilitación, el rechazo y la baja se confirman en un modal con el logo
institucional. El modal permanece abierto hasta cancelar o completar el cambio;
los errores aparecen dentro del modal y el motivo opcional se escribe allí.

Lectura de materiales: al tocar un material en móvil se abre un visor que ocupa
la pantalla, con un botón para volver al curso. En escritorio se puede ampliar.
El PDF se renderiza con PDF.js, con navegación y zoom propios, sin barra nativa
de descarga o compartir. En HTML se ocultan acciones de descarga, impresión y
compartir y se restringen ventanas emergentes y descargas mediante sandbox.
Los videos no ofrecen descarga ni reproducción remota en sus controles.

Las presentaciones siguen usando Office en HTTPS: se recorta su barra inferior
y se permite el formulario interno de Office que inicia PowerPointFrame.aspx.
Su reproductor incluye un botón de pantalla completa y otro para salir. En los
navegadores compatibles se amplía el lector existente sin recargar Office ni
perder la diapositiva actual. Cuando la API de pantalla completa no está
disponible, se usa una vista que ocupa toda la ventana, sin cabecera del aula.
Se restringen las descargas, compartir mediante Web Share y ventanas nuevas.
Estos ajustes de interfaz no impiden obtener el contenido mediante herramientas
del navegador. Los proveedores externos (Office, YouTube, Drive y sitios
enlazados) controlan su interfaz y pueden cambiarla; la integración no garantiza
ocultar todas sus acciones internas. Un sitio enlazado puede impedir su lectura
en iframe mediante sus propias políticas de seguridad.

Correos: HTML con formato institucional y versión de texto plano. Los avisos a
Presidencia van a los usuarios activos con rol presidente (o a NOTIFY_EMAIL si no
hay ninguno). Requieren SMTP_USER y SMTP_PASS; sin SMTP no se envían y, fuera de
producción, el enlace de confirmación se muestra en la consola del backend.

Calificación: una pregunta suma sus puntos solo si se marcan exactamente las
opciones correctas. De cada examen publicado cuenta el mejor intento. La nota
final es el promedio de esos exámenes (los no rendidos valen 0) y aprueba quien
obtiene la nota mínima o más. Sin exámenes, el certificado es de participación.

Certificación: al concluir el curso (fecha de fin pasada o estado Finalizado)
los aprobados muestran "Preparar certificado", que abre el editor de
Certificados con los datos del participante. Al emitirlo se vincula a la
inscripción y el participante puede descargarlo desde su aula.

Presidencia y el instructor ven la lista de participantes, el avance, la nota de
cada examen y la nota final, y pueden descargarla en Excel.

Seguridad
---------

- Las cuentas externas usan un JWT firmado con otro secreto (CURSOS_JWT_SECRET,
  o JWT_SECRET + sufijo): no sirven en el resto de la API.
- El rol se lee de la base en cada solicitud; usuarios inactivos no acceden.
- Los archivos se guardan en backend/storage/cursos (no en uploads/, que es
  público) y se sirven con un enlace firmado de 6 horas. Se valida la extensión
  y la firma binaria de cada archivo.
- El HTML del instructor se muestra en un iframe sandbox sin allow-same-origin:
  sus scripts no acceden a la sesión ni a la página.
- Las respuestas correctas nunca se envían al participante; la nota se calcula
  en el servidor y el límite de intentos se respeta con envíos simultáneos.

Despliegue
----------

1. Publicar el frontend generado con `npm run build` en `yunka-atoq-react`.
2. Publicar en el backend: `server.js`, `mailer.js`, `routes/cursos.js`,
   `services/cursos.js`, `services/cursosCorreos.js`,
   `services/migracionesSql.js` y los scripts 29 y 30.
3. Las tablas se crean al primer uso desde `services/migracionesSql.js`. Para
   crearlas a mano, en este orden:
   `mysql -u USUARIO -p BASE < scripts/29_cursos_online.sql` (idempotente) y,
   una sola vez, `mysql -u USUARIO -p BASE < scripts/30_cursos_aprobacion.sql`.
   El 30 deja confirmadas las cuentas externas existentes y pasa las
   inscripciones "pago por confirmar" a "por habilitar".
4. Crear `backend/storage/cursos` con permiso de escritura para Node y
   respaldarla junto con las tablas `curso_*` y `cursos_online`.
5. Variables opcionales: `CURSOS_MAX_MB` (tamaño máximo por archivo, 300 por
   defecto), `CURSOS_JWT_SECRET`, `CURSOS_JWT_EXPIRES_IN` (7d) y `SITE_URL`
   (dominio de los enlaces de los correos; si falta se usa FRONTEND_URL). Si el hosting limita el tamaño de subida
   (Apache/LiteSpeed `LimitRequestBody`, proxy), ajustarlo para videos o usar
   enlaces de YouTube no listados.
6. El visor de presentaciones usa Microsoft Office Online: solo funciona con la
   API publicada en HTTPS. En local se ofrece la descarga.
7. Reiniciar Node.

Pruebas
-------

`npm run test:cursos` ejecuta las validaciones. Con `GESTION_TEST_LOCAL=1`
corre además el flujo completo sobre una base temporal `cursos_test_*` en el
MySQL/MariaDB local (la crea y la elimina). En el frontend:
`npm run test:cursos` (enlaces embebidos y visor de Office).
