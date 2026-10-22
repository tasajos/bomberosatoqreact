-- Solicitudes de dinero con concepto «Otro» especificado y roles de guardia institucionales.
-- El backend lo aplica una sola vez al iniciar el módulo de gestión.
-- Para replicarlo manualmente en producción, ejecutarlo una vez sobre la base configurada.
-- «Socorrista» no es un rol de la institución: las guardias registradas así pasan a «Rescatista».
UPDATE guardias SET rol_guardia='Rescatista' WHERE rol_guardia='Socorrista';
-- Última sentencia: testigo del script.
ALTER TABLE fin_solicitudes ADD COLUMN concepto_otro VARCHAR(80) NULL AFTER concepto
