-- ============================================================
-- Yunka Atoq · Bomberos Voluntarios · Schema MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS yunka_atoq
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE yunka_atoq;

-- Usuarios del sistema (voluntarios, admin)
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(120) NOT NULL,
  email        VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('admin', 'voluntario') NOT NULL DEFAULT 'voluntario',
  activo       TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Perfil extendido de voluntarios (para la web pública)
CREATE TABLE IF NOT EXISTS voluntarios (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  user_id  INT NOT NULL UNIQUE,
  cargo    VARCHAR(100),
  unidad   VARCHAR(100),
  foto_url VARCHAR(500),
  publico  TINYINT(1) NOT NULL DEFAULT 0,
  orden    INT NOT NULL DEFAULT 99,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Operativos / emergencias
CREATE TABLE IF NOT EXISTS operativos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  tipo        VARCHAR(100) NOT NULL,
  descripcion TEXT,
  fecha       DATETIME NOT NULL,
  estado      ENUM('activo','cerrado','cancelado') NOT NULL DEFAULT 'cerrado',
  unidad      VARCHAR(100),
  created_by  INT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Campañas de donación
CREATE TABLE IF NOT EXISTS campanias (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(200) NOT NULL,
  descripcion TEXT,
  meta        DECIMAL(10,2) NOT NULL DEFAULT 0,
  recaudado   DECIMAL(10,2) NOT NULL DEFAULT 0,
  donantes    INT NOT NULL DEFAULT 0,
  estado      ENUM('activa','cerrada','pausada') NOT NULL DEFAULT 'activa',
  imagen_url  VARCHAR(500),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Donaciones individuales
CREATE TABLE IF NOT EXISTS donaciones (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  campania_id  INT NOT NULL,
  monto        DECIMAL(10,2) NOT NULL,
  donante_nombre VARCHAR(150),
  donante_email  VARCHAR(180),
  metodo       ENUM('transferencia','qr','tigo_money','tarjeta','efectivo') NOT NULL DEFAULT 'transferencia',
  comprobante  VARCHAR(500),
  verificado   TINYINT(1) NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campania_id) REFERENCES campanias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Noticias / novedades
CREATE TABLE IF NOT EXISTS noticias (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  titulo      VARCHAR(300) NOT NULL,
  resumen     TEXT,
  contenido   LONGTEXT NOT NULL,
  imagen_url  VARCHAR(500),
  fecha       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  autor_id    INT,
  publicado   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (autor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Postulaciones de voluntariado
CREATE TABLE IF NOT EXISTS postulaciones (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(150) NOT NULL,
  email     VARCHAR(180) NOT NULL,
  telefono  VARCHAR(30),
  edad      TINYINT UNSIGNED,
  mensaje   TEXT,
  revisado  TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- Datos iniciales
-- ============================================================

-- Admin por defecto  (password: Admin2026!)
INSERT IGNORE INTO users (id, nombre, email, password_hash, role) VALUES
(1, 'Administrador', 'admin@yunkaatoq.bo',
 '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Campaña inicial de ejemplo
INSERT IGNORE INTO campanias (nombre, descripcion, meta, recaudado, donantes, estado) VALUES
('Equipos de respiración autónoma · ERA-2026',
 'Adquisición de 4 equipos ERA para operaciones en atmósferas peligrosas.',
 275000.00, 186420.00, 412, 'activa');
