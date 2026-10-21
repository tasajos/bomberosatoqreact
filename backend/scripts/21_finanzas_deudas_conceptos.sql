-- Concepto de cada movimiento (para reportes por concepto) y registro de deudas y préstamos.
-- Requiere 18, 19 y 20. El backend lo aplica una sola vez al iniciar el módulo.
-- Para replicarlo manualmente en producción, ejecutarlo una vez sobre la base configurada.
ALTER TABLE fin_movimientos ADD COLUMN concepto VARCHAR(40) NULL AFTER tipo;
-- Los movimientos existentes toman el concepto de su origen.
UPDATE fin_movimientos m JOIN fin_solicitudes s ON s.id=m.solicitud_id SET m.concepto=s.concepto WHERE m.concepto IS NULL;
UPDATE fin_movimientos SET concepto='mensualidad' WHERE concepto IS NULL AND voluntario_id IS NOT NULL;
UPDATE fin_movimientos SET concepto=IF(tipo='ingreso','otros_ingresos','otros_egresos') WHERE concepto IS NULL;
-- Deuda de la institución: préstamo recibido, obligación con un proveedor u otra.
-- El saldo no se almacena: monto menos los egresos vinculados a la deuda.
CREATE TABLE IF NOT EXISTS fin_deudas (
 id INT AUTO_INCREMENT PRIMARY KEY, tipo ENUM('prestamo','proveedor','otro') NOT NULL,
 acreedor VARCHAR(200) NOT NULL, detalle VARCHAR(1000) NOT NULL, monto DECIMAL(12,2) NOT NULL,
 fecha DATE NOT NULL, vencimiento DATE NULL, movimiento_ingreso_id INT NULL UNIQUE,
 creado_por INT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (movimiento_ingreso_id) REFERENCES fin_movimientos(id), FOREIGN KEY (creado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Última sentencia: el backend la usa como testigo de que el script ya se aplicó.
ALTER TABLE fin_movimientos ADD COLUMN deuda_id INT NULL AFTER voluntario_id,
 ADD FOREIGN KEY (deuda_id) REFERENCES fin_deudas(id)
