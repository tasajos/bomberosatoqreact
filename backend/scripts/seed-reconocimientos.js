import pool from '../db.js';

await pool.query(`CREATE TABLE IF NOT EXISTS reconocimientos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  badge       VARCHAR(80)   NOT NULL,
  fecha       VARCHAR(60)   NOT NULL,
  institucion VARCHAR(300)  NOT NULL,
  titulo      VARCHAR(300)  NOT NULL,
  descripcion TEXT,
  texto_completo LONGTEXT,
  firmante    VARCHAR(300),
  icono       VARCHAR(10)   DEFAULT '🏅',
  img_url     VARCHAR(500),
  activo      TINYINT(1)    NOT NULL DEFAULT 1,
  orden       INT           NOT NULL DEFAULT 99,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

const [[{ c }]] = await pool.query('SELECT COUNT(*) as c FROM reconocimientos');

if (Number(c) === 0) {
  await pool.query(`INSERT INTO reconocimientos
    (badge, fecha, institucion, titulo, descripcion, texto_completo, firmante, icono, img_url, activo, orden)
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1),
    (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 2),
    (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 3),
    (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 4)`,
  [
    'Gubernamental',
    'Octubre 2025',
    'Gobierno Autónomo Departamental de Cochabamba',
    'Certificado de Reconocimiento',
    'Por las acciones de apoyo logístico, atención a emergencias y desastres ante eventos adversos de origen natural y antrópico, cuidando el medio ambiente al Departamento de Cochabamba.',
    'El Gobierno Autónomo Departamental de Cochabamba otorga el presente Certificado de Reconocimiento a la Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental "Yunka Atoq", por las acciones de apoyo logístico, atención a emergencias y desastres, ante eventos adversos de origen natural y antrópico, cuidando el medio ambiente al Departamento de Cochabamba. Cochabamba, octubre de 2025.',
    'Humberto Sánchez Sánchez · Gobernador',
    '🏛️',
    '/reconocimientos/gobernacion.jpg',

    'Municipal',
    '27 Nov 2023',
    'Sub Alcaldía Distrito Tumupasa · Prov. Abel Iturralde, La Paz',
    'Carta de Agradecimiento',
    'Por el apoyo social constante al pueblo e institución, coadyuvando en los días de emergencia por incendio que sufrió el Municipio y Distrito de Tumupasa.',
    'La Sub Alcaldía del Distrito de Tumupasa hace llegar sus más sinceros agradecimientos a la Brigada de Bomberos Voluntarios Yunka Atoq por el apoyo social constante a nuestro pueblo e institución, coadyuvando en los días de emergencia por incendio que sufrió nuestro Municipio y Distrito de Tumupasa. Tumupasa, 27 de noviembre de 2023.',
    'Gary A. Terrazas Beyuma · Sub Alcalde · Romer R. Vargas Chuqui · Corregidor Territorial',
    '🏘️',
    '/reconocimientos/tumupasa.jpg',

    'Legislativo',
    'Julio 2025',
    'Cámara de Diputados · Asamblea Legislativa Plurinacional de Bolivia',
    'Reconocimiento Nº 48/2024-2025',
    'Por su trayectoria institucional, fortalecimiento y apoyo en Emergencias y Ayuda Humanitaria, promoviendo el voluntariado con proyectos sostenibles que benefician a diversas comunidades en Bolivia.',
    'La Comisión de Política Social de la Cámara de Diputados rinde un justo y merecido Reconocimiento Camaral a la Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental "Yunka Atoq", por su trayectoria institucional, fortalecimiento y apoyo en Emergencias y Ayuda Humanitaria. Es dado en la Cámara de Diputados de la Asamblea Legislativa Plurinacional de Bolivia, a los 07 días del mes de julio de dos mil veinticinco años.',
    'Dip. Sergio Maniguary Moura · Presidente Comisión Política Social',
    '🎖️',
    '/reconocimientos/diputados-48.jpg',

    'Presidencia ALP',
    'Julio 2025',
    'Presidencia de la Cámara de Diputados · PRES.REC/DYS/N°2456/2024-2025',
    'Reconocimiento de la Presidencia — Cámara de Diputados',
    'Por el valioso aporte a la promoción del voluntariado a nivel nacional, impulsando proyectos sostenibles y acciones solidarias en salvamento, rescate y protección ambiental.',
    'En el marco de mis atribuciones como presidente de la Cámara de Diputados, otorgo el presente Reconocimiento a la Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental "Yunka Atoq", por su valioso aporte a la promoción del voluntariado a nivel nacional. La Paz, julio de 2025.',
    'Omer Yucra Santas · Presidente Cámara de Diputados',
    '🏅',
    '/reconocimientos/diputados-presidencia.jpg',
  ]);
  console.log('✅ 4 reconocimientos insertados.');
} else {
  console.log(`ℹ️  Ya existen ${c} reconocimientos.`);
}

const [rows] = await pool.query('SELECT id, badge, titulo, orden FROM reconocimientos ORDER BY orden');
rows.forEach(r => console.log(`  ${r.orden}. [${r.badge}] ${r.titulo}`));
process.exit(0);
