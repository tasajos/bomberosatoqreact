-- Cursos online: cursos con instructor, módulos, materiales, exámenes e inscripciones de voluntarios y externos.
-- Ejecutar sobre la base configurada (mysql -u USUARIO -p BASE < scripts/29_cursos_online.sql).
-- También se aplica al iniciar el backend desde services/migracionesSql.js. Es idempotente.
CREATE TABLE IF NOT EXISTS curso_cuentas (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nombre VARCHAR(120) NOT NULL,
 apellidos VARCHAR(160) NOT NULL,
 documento VARCHAR(40) NOT NULL,
 email VARCHAR(180) NOT NULL UNIQUE,
 telefono VARCHAR(40),
 institucion VARCHAR(200),
 password_hash VARCHAR(255) NOT NULL,
 es_instructor TINYINT(1) NOT NULL DEFAULT 0,
 activo TINYINT(1) NOT NULL DEFAULT 1,
 creado_por INT,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS cursos_online (
 id INT AUTO_INCREMENT PRIMARY KEY,
 titulo VARCHAR(200) NOT NULL,
 descripcion TEXT,
 visibilidad ENUM('interno','publico') NOT NULL DEFAULT 'interno',
 instructor_user_id INT,
 instructor_cuenta_id INT,
 horas DECIMAL(6,1) NOT NULL,
 fecha_inicio DATE NOT NULL,
 fecha_fin DATE NOT NULL,
 costo DECIMAL(10,2) NOT NULL DEFAULT 0,
 info_pago VARCHAR(1000),
 cupo INT NOT NULL DEFAULT 0,
 nota_minima DECIMAL(5,2) NOT NULL DEFAULT 51,
 estado ENUM('borrador','publicado','finalizado','cancelado') NOT NULL DEFAULT 'borrador',
 creado_por INT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_cursos_catalogo (estado, visibilidad, fecha_inicio),
 FOREIGN KEY (instructor_user_id) REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY (instructor_cuenta_id) REFERENCES curso_cuentas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curso_modulos (
 id INT AUTO_INCREMENT PRIMARY KEY,
 curso_id INT NOT NULL,
 titulo VARCHAR(200) NOT NULL,
 descripcion TEXT,
 orden INT NOT NULL DEFAULT 0,
 INDEX idx_modulos_curso (curso_id, orden),
 FOREIGN KEY (curso_id) REFERENCES cursos_online(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curso_materiales (
 id INT AUTO_INCREMENT PRIMARY KEY,
 modulo_id INT NOT NULL,
 titulo VARCHAR(200) NOT NULL,
 tipo ENUM('pdf','presentacion','video','html','enlace') NOT NULL,
 archivo VARCHAR(80),
 nombre_original VARCHAR(255),
 tamano BIGINT,
 url VARCHAR(500),
 html MEDIUMTEXT,
 orden INT NOT NULL DEFAULT 0,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_materiales_modulo (modulo_id, orden),
 FOREIGN KEY (modulo_id) REFERENCES curso_modulos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curso_examenes (
 id INT AUTO_INCREMENT PRIMARY KEY,
 curso_id INT NOT NULL,
 modulo_id INT,
 titulo VARCHAR(200) NOT NULL,
 instrucciones TEXT,
 intentos_max INT NOT NULL DEFAULT 2,
 publicado TINYINT(1) NOT NULL DEFAULT 0,
 preguntas JSON NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_examen_modulo (modulo_id),
 INDEX idx_examenes_curso (curso_id),
 FOREIGN KEY (curso_id) REFERENCES cursos_online(id) ON DELETE CASCADE,
 FOREIGN KEY (modulo_id) REFERENCES curso_modulos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curso_inscripciones (
 id INT AUTO_INCREMENT PRIMARY KEY,
 curso_id INT NOT NULL,
 user_id INT,
 cuenta_id INT,
 estado ENUM('pendiente_pago','activa','rechazada','retirada') NOT NULL DEFAULT 'activa',
 pago_referencia VARCHAR(200),
 observacion VARCHAR(500),
 revisado_por INT,
 revisado_at DATETIME,
 certificado_id INT,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_inscripcion_usuario (curso_id, user_id),
 UNIQUE KEY uq_inscripcion_cuenta (curso_id, cuenta_id),
 FOREIGN KEY (curso_id) REFERENCES cursos_online(id) ON DELETE CASCADE,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY (cuenta_id) REFERENCES curso_cuentas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curso_intentos (
 id INT AUTO_INCREMENT PRIMARY KEY,
 examen_id INT NOT NULL,
 inscripcion_id INT NOT NULL,
 numero INT NOT NULL,
 respuestas JSON NOT NULL,
 puntaje DECIMAL(5,2) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_intento (inscripcion_id, examen_id, numero),
 FOREIGN KEY (examen_id) REFERENCES curso_examenes(id) ON DELETE CASCADE,
 FOREIGN KEY (inscripcion_id) REFERENCES curso_inscripciones(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS curso_progreso (
 inscripcion_id INT NOT NULL,
 material_id INT NOT NULL,
 visto_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (inscripcion_id, material_id),
 FOREIGN KEY (inscripcion_id) REFERENCES curso_inscripciones(id) ON DELETE CASCADE,
 FOREIGN KEY (material_id) REFERENCES curso_materiales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
