-- Destinos de reserva configurables y cobro de mensualidades a voluntarios.
-- Requiere 18 y 19. El backend lo aplica una sola vez al iniciar el módulo.
-- Para replicarlo manualmente en producción, ejecutarlo una vez sobre la base configurada.
CREATE TABLE IF NOT EXISTS fin_destinos (
 clave VARCHAR(60) PRIMARY KEY, nombre VARCHAR(120) NOT NULL UNIQUE,
 requiere_campania TINYINT(1) NOT NULL DEFAULT 0, activo TINYINT(1) NOT NULL DEFAULT 1,
 creado_por INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (creado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO fin_destinos (clave,nombre,requiere_campania) VALUES
 ('campania','Campaña',1),('vehiculo','Compra de vehículo',0),('logistica','Logística',0);
ALTER TABLE fin_reservas MODIFY destino VARCHAR(60) NOT NULL;
ALTER TABLE fin_reservas ADD FOREIGN KEY (destino) REFERENCES fin_destinos(clave);
-- Tarifa vigente desde un mes (YYYY-MM) hasta la siguiente. Un monto 0 suspende el cobro.
CREATE TABLE IF NOT EXISTS fin_mensualidad_tarifas (
 id INT AUTO_INCREMENT PRIMARY KEY, desde CHAR(7) NOT NULL UNIQUE, monto DECIMAL(12,2) NOT NULL,
 dia_vencimiento TINYINT NOT NULL DEFAULT 10, creado_por INT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (creado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Mes desde el que se cobra a cada voluntario (por defecto, su mes de registro).
CREATE TABLE IF NOT EXISTS fin_mensualidad_voluntarios (
 voluntario_id INT PRIMARY KEY, inicio CHAR(7) NOT NULL, actualizado_por INT NOT NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (voluntario_id) REFERENCES users(id), FOREIGN KEY (actualizado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS fin_mensualidad_exenciones (
 id INT AUTO_INCREMENT PRIMARY KEY, voluntario_id INT NOT NULL, desde CHAR(7) NOT NULL, hasta CHAR(7) NULL,
 motivo VARCHAR(500) NOT NULL, creado_por INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (voluntario_id) REFERENCES users(id), FOREIGN KEY (creado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS fin_mensualidad_pagos (
 id INT AUTO_INCREMENT PRIMARY KEY, voluntario_id INT NOT NULL, periodo CHAR(7) NOT NULL,
 monto DECIMAL(12,2) NOT NULL, movimiento_id INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_mensualidad (voluntario_id, periodo),
 FOREIGN KEY (voluntario_id) REFERENCES users(id), FOREIGN KEY (movimiento_id) REFERENCES fin_movimientos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Última sentencia: el backend la usa como testigo de que el script ya se aplicó.
-- El ingreso (y su voucher FIN) identifica al voluntario que pagó.
ALTER TABLE fin_movimientos ADD COLUMN voluntario_id INT NULL AFTER solicitud_id,
 ADD FOREIGN KEY (voluntario_id) REFERENCES users(id)
