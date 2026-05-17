-- Script 03: agregar campo position a slider_images
USE yunka_atoq;
ALTER TABLE slider_images
  ADD COLUMN IF NOT EXISTS position VARCHAR(30) NOT NULL DEFAULT 'center center'
  AFTER tag;
