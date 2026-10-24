-- Cursos online: habilitación de inscripciones por presidencia y confirmación de correo de las cuentas externas.
-- Ejecutar una vez después de 29_cursos_online.sql (mysql -u USUARIO -p BASE < scripts/30_cursos_aprobacion.sql).
-- El backend lo aplica al iniciar si falta. Las cuentas externas que ya existían quedan con el correo confirmado.
ALTER TABLE curso_cuentas ADD COLUMN email_verificado TINYINT(1) NOT NULL DEFAULT 1 AFTER es_instructor;
ALTER TABLE curso_cuentas ALTER COLUMN email_verificado SET DEFAULT 0;
ALTER TABLE curso_cuentas ADD COLUMN verificacion_hash CHAR(64) NULL AFTER email_verificado;
ALTER TABLE curso_cuentas ADD COLUMN verificacion_expira DATETIME NULL AFTER verificacion_hash;
ALTER TABLE curso_inscripciones MODIFY estado ENUM('pendiente','pendiente_pago','activa','rechazada','retirada') NOT NULL DEFAULT 'pendiente';
UPDATE curso_inscripciones SET estado='pendiente' WHERE estado='pendiente_pago';
ALTER TABLE curso_inscripciones MODIFY estado ENUM('pendiente','activa','rechazada','retirada') NOT NULL DEFAULT 'pendiente';
