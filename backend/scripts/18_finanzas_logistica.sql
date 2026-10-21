-- Ejecutar sobre la base configurada. También se aplica al iniciar el módulo.
CREATE TABLE IF NOT EXISTS gestion_control (id INT PRIMARY KEY) ENGINE=InnoDB;
INSERT IGNORE INTO gestion_control (id) VALUES (1);
CREATE TABLE IF NOT EXISTS fin_solicitudes (
 id INT AUTO_INCREMENT PRIMARY KEY, solicitante_id INT NOT NULL,
 tipo ENUM('ingreso','egreso') NOT NULL, concepto VARCHAR(30) NOT NULL,
 detalle VARCHAR(2000) NOT NULL, monto DECIMAL(12,2) NOT NULL,
 estado ENUM('pendiente_finanzas','pendiente_presidencia','autorizada','ejecutada','rechazada') NOT NULL DEFAULT 'pendiente_finanzas',
 finanzas_por INT, finanzas_fecha DATETIME, presidencia_por INT, presidencia_fecha DATETIME,
 rechazo_motivo VARCHAR(1000), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (solicitante_id) REFERENCES users(id), FOREIGN KEY (finanzas_por) REFERENCES users(id),
 FOREIGN KEY (presidencia_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS fin_reservas (
 id INT AUTO_INCREMENT PRIMARY KEY, destino ENUM('campania','vehiculo','logistica') NOT NULL,
 campania_id INT, detalle VARCHAR(1000) NOT NULL, monto DECIMAL(12,2) NOT NULL,
 estado ENUM('activa','liberada') NOT NULL DEFAULT 'activa', creado_por INT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, liberada_at DATETIME,
 FOREIGN KEY (creado_por) REFERENCES users(id), FOREIGN KEY (campania_id) REFERENCES campanias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS fin_movimientos (
 id INT AUTO_INCREMENT PRIMARY KEY, tipo ENUM('ingreso','egreso') NOT NULL,
 monto DECIMAL(12,2) NOT NULL, detalle VARCHAR(2000) NOT NULL, referencia VARCHAR(200),
 solicitud_id INT UNIQUE, registrado_por INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (solicitud_id) REFERENCES fin_solicitudes(id), FOREIGN KEY (registrado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS log_equipos (
 id INT AUTO_INCREMENT PRIMARY KEY, codigo VARCHAR(80) NOT NULL UNIQUE, nombre VARCHAR(200) NOT NULL,
 tipo VARCHAR(100) NOT NULL, estado ENUM('bueno','regular','mantenimiento','danado','baja') NOT NULL,
 observaciones VARCHAR(2000) NOT NULL DEFAULT '', creado_por INT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (creado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS log_prestamos (
 id INT AUTO_INCREMENT PRIMARY KEY, equipo_id INT NOT NULL, voluntario_id INT NOT NULL,
 fecha_devolucion DATE NOT NULL, motivo VARCHAR(1000) NOT NULL,
 estado ENUM('pendiente','autorizado','rechazado','devuelto') NOT NULL DEFAULT 'pendiente',
 solicitado_por INT NOT NULL, autorizado_por INT, autorizado_at DATETIME, devuelto_por INT,
 devuelto_at DATETIME, estado_salida VARCHAR(30) NOT NULL, estado_devolucion VARCHAR(30),
 observacion_devolucion VARCHAR(1000), rechazo_motivo VARCHAR(1000), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (equipo_id) REFERENCES log_equipos(id), FOREIGN KEY (voluntario_id) REFERENCES users(id),
 FOREIGN KEY (solicitado_por) REFERENCES users(id), FOREIGN KEY (autorizado_por) REFERENCES users(id),
 FOREIGN KEY (devuelto_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS gestion_eventos (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, entidad VARCHAR(30) NOT NULL, entidad_id INT NOT NULL,
 accion VARCHAR(50) NOT NULL, actor_id INT NOT NULL, detalle TEXT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX (entidad, entidad_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS gestion_comandos (
 clave VARCHAR(80) NOT NULL, actor_id INT NOT NULL, huella CHAR(64) NOT NULL, resultado JSON NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (actor_id, clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS gestion_correos (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, evento VARCHAR(120) NOT NULL, destinatario VARCHAR(180) NOT NULL,
 asunto VARCHAR(200) NOT NULL, cuerpo TEXT NOT NULL, intentos INT NOT NULL DEFAULT 0,
 enviado_at DATETIME, ultimo_error VARCHAR(500), proximo_intento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_correo (evento, destinatario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
