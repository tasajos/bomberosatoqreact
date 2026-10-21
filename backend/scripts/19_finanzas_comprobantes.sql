-- Comprobantes correlativos de finanzas (FIN001, FIN002, …) para ingresos, egresos y reservas.
-- Requiere 18_finanzas_logistica.sql. El backend lo aplica una sola vez al iniciar el módulo.
-- Para replicarlo manualmente en producción, ejecutarlo una vez sobre la base configurada.
ALTER TABLE gestion_control ADD COLUMN fin_correlativo INT NOT NULL DEFAULT 0;
ALTER TABLE fin_movimientos ADD COLUMN comprobante VARCHAR(20) NULL UNIQUE AFTER id;
ALTER TABLE fin_reservas ADD COLUMN comprobante VARCHAR(20) NULL UNIQUE AFTER id,
 ADD COLUMN liberada_por INT NULL, ADD COLUMN liberada_motivo VARCHAR(1000) NULL,
 ADD FOREIGN KEY (liberada_por) REFERENCES users(id);
-- Numera en orden cronológico los registros existentes, compartiendo una sola secuencia.
CREATE TEMPORARY TABLE fin_numeracion AS
 SELECT origen, id, ROW_NUMBER() OVER (ORDER BY created_at, id, origen) n FROM (
  SELECT 'movimiento' origen, id, created_at FROM fin_movimientos
  UNION ALL SELECT 'reserva', id, created_at FROM fin_reservas) x;
UPDATE fin_movimientos m JOIN fin_numeracion o ON o.origen='movimiento' AND o.id=m.id
 SET m.comprobante=CONCAT('FIN', IF(o.n<1000, LPAD(o.n,3,'0'), o.n));
UPDATE fin_reservas r JOIN fin_numeracion o ON o.origen='reserva' AND o.id=r.id
 SET r.comprobante=CONCAT('FIN', IF(o.n<1000, LPAD(o.n,3,'0'), o.n));
UPDATE gestion_control SET fin_correlativo=(SELECT COUNT(*) FROM fin_numeracion) WHERE id=1;
DROP TEMPORARY TABLE fin_numeracion
