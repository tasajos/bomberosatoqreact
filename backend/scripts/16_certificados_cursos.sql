-- Ejecutar en la base de datos de la aplicación. No reinicia el correlativo existente.
CREATE TABLE IF NOT EXISTS certificados_cursos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  numero INT NOT NULL UNIQUE,
  token CHAR(64) NOT NULL UNIQUE,
  clave_solicitud CHAR(36) NOT NULL UNIQUE,
  datos JSON NOT NULL,
  creado_por INT NOT NULL,
  estado ENUM('pendiente','emitido') NOT NULL DEFAULT 'pendiente',
  sha256 CHAR(64),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  emitido_at DATETIME,
  KEY idx_certificados_estado (estado, numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS certificados_secuencia (
  id TINYINT PRIMARY KEY,
  siguiente_numero INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO certificados_secuencia (id, siguiente_numero)
SELECT 1, GREATEST(100, COALESCE(MAX(numero) + 1, 100)) FROM certificados_cursos
ON DUPLICATE KEY UPDATE id = id;
