-- Jefatura de personal: comisiones y llamadas de atención (correlativo LLA001, LLA002, …).
-- Requiere 18. El backend lo aplica una sola vez al iniciar el módulo.
-- Para replicarlo manualmente en producción, ejecutarlo una vez sobre la base configurada.
-- Asistencia y bitácora ya existían (routes/personal.js), se crean aquí si faltan.
CREATE TABLE IF NOT EXISTS instruccion_asistencia (
 id INT PRIMARY KEY AUTO_INCREMENT, voluntario_id INT NOT NULL, fecha DATE NOT NULL,
 estado ENUM('presente','tarde','falta','permiso','comision') NOT NULL DEFAULT 'presente',
 observacion TEXT, registrado_por INT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_vol_fecha (voluntario_id, fecha), FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS voluntario_log (
 id INT PRIMARY KEY AUTO_INCREMENT, voluntario_id INT NOT NULL, accion VARCHAR(40) NOT NULL, detalle TEXT,
 registrado_por INT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (voluntario_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Comisión: el estado previo se restaura al finalizarla.
CREATE TABLE IF NOT EXISTS per_comisiones (
 id INT AUTO_INCREMENT PRIMARY KEY, voluntario_id INT NOT NULL, motivo VARCHAR(1000) NOT NULL,
 destino VARCHAR(200) NOT NULL, desde DATE NOT NULL, hasta DATE NULL,
 estado ENUM('activa','finalizada') NOT NULL DEFAULT 'activa', estado_anterior VARCHAR(20) NOT NULL DEFAULT 'activo',
 creado_por INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 finalizada_por INT NULL, finalizada_at DATETIME NULL, observacion_cierre VARCHAR(1000) NULL,
 FOREIGN KEY (voluntario_id) REFERENCES users(id), FOREIGN KEY (creado_por) REFERENCES users(id),
 FOREIGN KEY (finalizada_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Personal que ya figuraba en comisión: se le abre una comisión activa para poder finalizarla.
INSERT INTO per_comisiones (voluntario_id,motivo,destino,desde,estado_anterior,creado_por)
 SELECT u.id,'Comisión registrada antes del módulo de personal','Sin especificar',CURDATE(),'activo',u.id
 FROM users u WHERE u.estado_personal='comision'
 AND NOT EXISTS (SELECT 1 FROM per_comisiones c WHERE c.voluntario_id=u.id AND c.estado='activa');
-- Última sentencia: testigo del script.
CREATE TABLE per_llamadas (
 id INT AUTO_INCREMENT PRIMARY KEY, numero INT NOT NULL UNIQUE, codigo VARCHAR(20) NOT NULL UNIQUE,
 voluntario_id INT NOT NULL, tipo ENUM('verbal','escrita') NOT NULL, gravedad ENUM('leve','grave','muy_grave') NOT NULL,
 motivo VARCHAR(200) NOT NULL, descripcion TEXT NOT NULL, fecha DATE NOT NULL, puntos INT NOT NULL DEFAULT 0,
 registrado_por INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (voluntario_id) REFERENCES users(id), FOREIGN KEY (registrado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
