-- ============================================================
-- Yunka Atoq · Script 01: Crear base de datos y usuario admin
--
-- INSTRUCCIONES:
--   1. Abre MySQL Workbench o tu cliente MySQL
--   2. Ejecuta este script completo
--   3. El admin quedará listo para iniciar sesión
--
-- Credenciales del admin:
-- 
-- ============================================================

-- 1. Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS yunka_atoq
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE yunka_atoq;

-- 2. Crear tabla users si no existe
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(120) NOT NULL,
  email        VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('admin', 'voluntario') NOT NULL DEFAULT 'voluntario',
  activo       TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Insertar o actualizar usuario administrador
--    Password: YunkaAtoq2026!
INSERT INTO users (nombre, email, password_hash, role, activo)
VALUES (
  'Administrador',
  'admin@yunkaatoq.bo',
  '$2a$12$JGmXs2xeCfWzWGaDE1cXwOYHM5ucfkpKrT.275sy8qNcY99kLsLqu',
  'admin',
  1
)
ON DUPLICATE KEY UPDATE
  password_hash = '$2a$12$JGmXs2xeCfWzWGaDE1cXwOYHM5ucfkpKrT.275sy8qNcY99kLsLqu',
  role          = 'admin',
  activo        = 1;

-- 4. Verificar que quedó bien
SELECT id, nombre, email, role, activo, created_at
FROM users
WHERE email = 'admin@yunkaatoq.bo';

-- ============================================================
-- Resultado esperado:
--   id | nombre          | email               | role  | activo
--   1  | Administrador   | admin@yunkaatoq.bo  | admin | 1
-- ============================================================
