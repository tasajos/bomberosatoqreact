Certificados de cursos
=====================

El editor está en Presidente > Documentos > Certificados. Cada curso también
incluye el acceso Preparar certificado. Las vistas previas y la plantilla
descargable son borradores de dos páginas horizontales y no reservan números.

Emitir y descargar registra el certificado, asigna el siguiente número global
(CRTYA-100, CRTYA-101, ...) y guarda el PDF original. En ambas caras figura
`CRTYA-N - Nombre del curso`. El reverso contiene el temario y el sello del
libro de capacitaciones, con el código de control en un recuadro rectangular. El registro de certificados
se muestra al pie del editor; no modifica el libro de guardias del personal.

El QR es opcional y abre `/certificados/verificar/:token` dentro del sitio.
La ficha pública muestra los datos académicos, el titular, el temario y los
responsables del certificado emitido. No muestra el PDF, documentos de
identidad ni datos internos. No requiere iniciar sesión ni ofrece una descarga.
Los QR antiguos que apuntaban a la descarga se redirigen a la ficha pública.
La descarga del original requiere autenticación de Presidencia o Administración.
No existe una búsqueda pública por nombre, número o documento. Los PDF
emitidos no se sobrescriben.

La numeración se asigna dentro de una transacción con bloqueo de la secuencia.
Una clave de solicitud evita duplicar números al reintentar la misma emisión.
Si la carga del PDF falla, el registro queda Pendiente. Usa Retomar emisión
en el libro para completar el mismo número. Nunca se reinicia el contador.

Despliegue
----------

1. Publicar el frontend generado con `npm run build` en `yunka-atoq-react`.
2. Publicar `backend/server.js`, `routes/certificados.js`,
   `services/certificados.js` y `scripts/16_certificados_cursos.sql`.
3. Ejecutar el SQL en la base configurada por DB_NAME, o permitir que el
   backend cree las tablas al primer uso. El script es idempotente.
4. Reiniciar Node. Comprobar que el proceso puede escribir en
   `backend/storage/certificados`. Conservar y respaldar esa carpeta junto
   con las tablas `certificados_cursos` y `certificados_secuencia`.
5. VITE_API_URL debe señalar la API HTTPS antes de compilar. Los nuevos QR
   usan el dominio del sitio desde el que se emiten. Mantener accesibles la
   ruta `/certificados/verificar/:token` y la API para conservar su verificación.
   SITE_URL en el backend debe ser la URL pública del sitio para redirigir los
   QR emitidos con la versión anterior.

Los datos se completan antes de emitir, incluidos el temario, los firmantes
y las fechas. La impresión a doble cara horizontal usa volteo por borde corto.

Pruebas
-------

`node --test tests/certificados.test.js` ejecuta las validaciones. Para las
pruebas de concurrencia y HTTP, establecer CERTIFICADOS_TEST_MYSQL a una
instancia MySQL/MariaDB exclusiva de pruebas. El test crea y elimina su propia
base con prefijo certificados_test_; no utilizar credenciales de producción.
