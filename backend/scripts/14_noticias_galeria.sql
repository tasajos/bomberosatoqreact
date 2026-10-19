-- Galería de fotos para noticias propias (carrusel en la página de la noticia).
-- Ejecutar: mysql -u <usuario> -p yunka_atoq < backend/scripts/14_noticias_galeria.sql
USE yunka_atoq;

CREATE TABLE IF NOT EXISTS noticia_imagenes (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  noticia_id  INT NOT NULL,
  url         VARCHAR(500) NOT NULL,
  orden       INT NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_noticia (noticia_id, orden),
  FOREIGN KEY (noticia_id) REFERENCES noticias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
