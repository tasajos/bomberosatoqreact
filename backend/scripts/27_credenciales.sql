CREATE TABLE IF NOT EXISTS credenciales_control (id INT PRIMARY KEY) ENGINE=InnoDB;
INSERT IGNORE INTO credenciales_control (id) VALUES (1);
CREATE TABLE IF NOT EXISTS credenciales (
 id INT AUTO_INCREMENT PRIMARY KEY,
 voluntario_id INT NOT NULL,
 token CHAR(64) NOT NULL UNIQUE,
 clave_solicitud CHAR(36) NOT NULL UNIQUE,
 huella CHAR(64) NOT NULL,
 datos JSON NOT NULL,
 estado ENUM('pendiente','emitida','reemplazada','anulada') NOT NULL DEFAULT 'pendiente',
 fecha_emision DATE NOT NULL,
 fecha_vencimiento DATE NOT NULL,
 creado_por INT NOT NULL,
 emitido_at DATETIME,
 anulado_por INT,
 anulacion_motivo VARCHAR(500),
 anulado_at DATETIME,
 sha256 CHAR(64),
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_credencial_voluntario (voluntario_id, id),
 FOREIGN KEY (voluntario_id) REFERENCES users(id),
 FOREIGN KEY (creado_por) REFERENCES users(id),
 FOREIGN KEY (anulado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
