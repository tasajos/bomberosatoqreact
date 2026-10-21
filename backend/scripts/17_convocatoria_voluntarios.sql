-- Fechas y plazas de la convocatoria de voluntarios (página /voluntarios).
-- Se editan desde Admin/Presidencia → Postulaciones. No sobrescribe valores existentes.
INSERT IGNORE INTO configuracion (clave, valor, label) VALUES
  ('convocatoria_inicio', '',           'Convocatoria: fecha de apertura'),
  ('convocatoria_cierre', '2026-06-30', 'Convocatoria: fecha de cierre'),
  ('convocatoria_plazas', '42',         'Convocatoria: plazas disponibles');
