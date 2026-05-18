-- Script 05: Actualizar categoría Entrenamiento → Capacitacion en galeria
USE yunka_atoq;

UPDATE galeria SET category = 'Capacitacion' WHERE category = 'Entrenamiento';

-- Verificar
SELECT category, COUNT(*) as total FROM galeria GROUP BY category ORDER BY category;
