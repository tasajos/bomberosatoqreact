-- Agrega noticias destacadas (slider de la página de inicio, máx. 3).
-- Ejecutar: mysql -u <usuario> -p yunka_atoq < backend/scripts/13_noticias_destacadas.sql
USE yunka_atoq;

ALTER TABLE noticias
  ADD COLUMN IF NOT EXISTS destacada TINYINT(1) NOT NULL DEFAULT 0 AFTER publicado;
