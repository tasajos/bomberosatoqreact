-- ============================================================
-- Órdenes de Operación / Emergencia
-- Solicitudes de operación creadas desde la vista del presidente
-- (Dpto. Operaciones). Registran voluntarios requeridos, equipos
-- necesarios, nivel de dificultad, ubicación en mapa (lat/lng) e
-- imágenes posicionadas sobre el mapa. Una vez activas son visibles
-- para todos los usuarios del sistema, que pueden inscribirse.
--
-- Replicar en producción:
--   mysql -u <usuario> -p yunka_atoq < scripts/08_ordenes_operacion.sql
-- ============================================================

USE yunka_atoq;

-- Orden de operación / emergencia
CREATE TABLE IF NOT EXISTS ordenes_operacion (
  id                    INT PRIMARY KEY AUTO_INCREMENT,
  titulo                VARCHAR(200) NOT NULL,
  descripcion           TEXT,
  nivel_dificultad      ENUM('baja','media','alta','critica') NOT NULL DEFAULT 'media',
  equipos_necesarios    TEXT,
  voluntarios_requeridos INT NOT NULL DEFAULT 0,
  direccion             VARCHAR(255),
  lat                   DECIMAL(10,7),
  lng                   DECIMAL(10,7),
  estado                ENUM('activa','en_curso','finalizada','cancelada') NOT NULL DEFAULT 'activa',
  creado_por            INT,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Imágenes posicionadas sobre el mapa de la orden
CREATE TABLE IF NOT EXISTS orden_operacion_imagenes (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  orden_id     INT NOT NULL,
  url          VARCHAR(255) NOT NULL,
  descripcion  VARCHAR(255),
  lat          DECIMAL(10,7),
  lng          DECIMAL(10,7),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orden_id) REFERENCES ordenes_operacion(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Voluntarios inscritos a una orden de operación
CREATE TABLE IF NOT EXISTS orden_operacion_voluntarios (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  orden_id      INT NOT NULL,
  voluntario_id INT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_orden_vol (orden_id, voluntario_id),
  FOREIGN KEY (orden_id)      REFERENCES ordenes_operacion(id) ON DELETE CASCADE,
  FOREIGN KEY (voluntario_id) REFERENCES users(id)             ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
