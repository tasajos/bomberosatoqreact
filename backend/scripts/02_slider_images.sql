-- ============================================================
-- Script 02: Tabla slider_images
-- Ejecutar en MySQL sobre la base de datos yunka_atoq
-- ============================================================

USE yunka_atoq;

CREATE TABLE IF NOT EXISTS slider_images (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  filename   VARCHAR(255)  NOT NULL,
  url        VARCHAR(500)  NOT NULL,
  caption    VARCHAR(200)  DEFAULT '',
  tag        VARCHAR(80)   DEFAULT '',
  activo     TINYINT(1)    NOT NULL DEFAULT 1,
  orden      INT           NOT NULL DEFAULT 99,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Imágenes iniciales del slider actual (rutas públicas del frontend)
INSERT IGNORE INTO slider_images (filename, url, caption, tag, activo, orden) VALUES
('history_7.jpg',    '/history/7.jpg',       'Incendio estructural · Cala Cala',              'Operativo',    1, 1),
('history_4.jpg',    '/history/4.jpg',       'Brigada Tunari · 41 días de combate',           'Forestal',     1, 2),
('history_9.jpg',    '/history/9.jpg',       'Extracción vehicular · Blanco Galindo',         'Rescate',      1, 3),
('history_12.jpg',   '/history/12.jpg',      'Entrenamiento NFPA 1001 · Cuartel central',     'Capacitación', 1, 4),
('history_15.jpg',   '/history/15.jpg',      'Escuela bomberil · Quillacollo',                'Comunidad',    1, 5),
('history_18.jpg',   '/history/18.jpg',      'Respuesta nocturna · Zona Sur',                 'Operativo',    1, 6),
('trabajo_rr3.jpg',  '/trabajo/rr3.jpg',     'Unidad B-04 en ruta de emergencia',             'Unidad',       1, 7),
('history_atoq.png', '/history/atoq.png',    'Cuartel Yunka Atoq · Av. Heroínas 1456',        'Cuartel',      1, 8);

SELECT id, filename, caption, tag, activo, orden FROM slider_images ORDER BY orden;
