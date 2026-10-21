-- Reglamento de méritos y deméritos: cada registro disciplinario cita un artículo con su puntaje.
-- Requiere 23. El backend lo aplica una sola vez al iniciar el módulo.
-- Para replicarlo manualmente en producción, ejecutarlo una vez sobre la base configurada.
CREATE TABLE IF NOT EXISTS per_reglamento (
 id INT AUTO_INCREMENT PRIMARY KEY, tipo ENUM('merito','demerito') NOT NULL, codigo VARCHAR(40) NOT NULL,
 descripcion VARCHAR(300) NOT NULL, gravedad ENUM('leve','grave','muy_grave') NULL, puntos INT NOT NULL DEFAULT 0,
 sancion VARCHAR(300) NULL, activo TINYINT(1) NOT NULL DEFAULT 1, creado_por INT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_reglamento (tipo, codigo, descripcion),
 FOREIGN KEY (creado_por) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Ítems disciplinarios del Reglamento RO-001/25 de Antigüedad y Jerarquía (el mismo que usa Operaciones).
INSERT IGNORE INTO per_reglamento (tipo,codigo,descripcion,gravedad,puntos) VALUES
 ('merito','RO-001/25','Memorándum a favor',NULL,5),
 ('merito','RO-001/25','Reconocimientos',NULL,4),
 ('merito','RO-001/25','Certificaciones de la institución',NULL,10),
 ('merito','RO-001/25','Certificaciones externas nacionales',NULL,5),
 ('merito','RO-001/25','Certificaciones internacionales',NULL,8),
 ('merito','RO-001/25','Representar a la institución ante instituciones internacionales',NULL,20),
 ('demerito','RO-001/25','Memorándum en contra','grave',6),
 ('demerito','RO-001/25','Arresto por oficiales','leve',1),
 ('demerito','RO-001/25','Arresto del coordinador departamental','leve',2),
 ('demerito','RO-001/25','Arresto del coordinador nacional','grave',3),
 ('demerito','RO-001/25','Informe negativo de finanzas','muy_grave',25);
ALTER TABLE meritos ADD COLUMN reglamento_id INT NULL, ADD FOREIGN KEY (reglamento_id) REFERENCES per_reglamento(id);
-- Última sentencia: testigo del script.
ALTER TABLE per_llamadas ADD COLUMN reglamento_id INT NULL, ADD FOREIGN KEY (reglamento_id) REFERENCES per_reglamento(id)
