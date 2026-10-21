-- Tipos de equipo configurables y actas correlativas de logística (LOG001, LOG002, …).
-- Requiere 18. El backend lo aplica una sola vez al iniciar el módulo.
-- Para replicarlo manualmente en producción, ejecutarlo una vez sobre la base configurada.
CREATE TABLE IF NOT EXISTS log_tipos (
 id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(100) NOT NULL UNIQUE, activo TINYINT(1) NOT NULL DEFAULT 1,
 creado_por INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (creado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO log_tipos (nombre) VALUES ('EPP'),('Rescate'),('Comunicaciones'),('Extinción'),('Primeros auxilios');
-- Los tipos escritos libremente en equipos existentes pasan al catálogo.
INSERT IGNORE INTO log_tipos (nombre) SELECT DISTINCT tipo FROM log_equipos;
ALTER TABLE log_equipos ADD FOREIGN KEY (tipo) REFERENCES log_tipos(nombre) ON UPDATE CASCADE;
-- Actas: entrega (préstamo autorizado), devolución y baja. Una de cada clase por préstamo.
-- Los registros previos se numeran en orden cronológico. Última sentencia: testigo del script.
CREATE TABLE log_actas (
 id INT AUTO_INCREMENT PRIMARY KEY, numero INT NOT NULL UNIQUE, codigo VARCHAR(20) NOT NULL UNIQUE,
 tipo ENUM('entrega','devolucion','baja') NOT NULL, prestamo_id INT NULL, equipo_id INT NOT NULL,
 estado_equipo VARCHAR(30) NULL, motivo VARCHAR(2000) NULL, registrado_por INT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_acta_prestamo (prestamo_id, tipo),
 FOREIGN KEY (prestamo_id) REFERENCES log_prestamos(id), FOREIGN KEY (equipo_id) REFERENCES log_equipos(id),
 FOREIGN KEY (registrado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SELECT n numero, CONCAT('LOG', IF(n<1000, LPAD(n,3,'0'), n)) codigo, tipo, prestamo_id, equipo_id, estado_equipo, motivo, registrado_por, fecha created_at
FROM (SELECT x.*, ROW_NUMBER() OVER (ORDER BY fecha, orden, ref) n FROM (
 SELECT 'entrega' tipo, p.id prestamo_id, p.equipo_id, p.motivo, p.estado_salida estado_equipo, p.autorizado_por registrado_por, p.autorizado_at fecha, 1 orden, p.id ref
  FROM log_prestamos p WHERE p.estado IN ('autorizado','devuelto') AND p.autorizado_at IS NOT NULL AND p.autorizado_por IS NOT NULL
 UNION ALL SELECT 'devolucion', p.id, p.equipo_id, p.observacion_devolucion, p.estado_devolucion, p.devuelto_por, p.devuelto_at, 2, p.id
  FROM log_prestamos p WHERE p.estado='devuelto' AND p.devuelto_at IS NOT NULL AND p.devuelto_por IS NOT NULL
 UNION ALL SELECT 'baja', NULL, e.entidad_id, JSON_UNQUOTE(JSON_EXTRACT(e.detalle,'$.motivo')), 'baja', e.actor_id, e.created_at, 3, e.id
  FROM gestion_eventos e WHERE e.entidad='equipo' AND e.accion='baja'
) x) y ORDER BY n
