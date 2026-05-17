import pool from '../db.js';

await pool.query(`CREATE TABLE IF NOT EXISTS slider_images (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  filename   VARCHAR(255)  NOT NULL,
  url        VARCHAR(500)  NOT NULL,
  caption    VARCHAR(200)  DEFAULT '',
  tag        VARCHAR(80)   DEFAULT '',
  activo     TINYINT(1)    NOT NULL DEFAULT 1,
  orden      INT           NOT NULL DEFAULT 99,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

const [[{ c }]] = await pool.query('SELECT COUNT(*) as c FROM slider_images');

if (Number(c) === 0) {
  await pool.query(`INSERT INTO slider_images (filename,url,caption,tag,activo,orden) VALUES
    ('history_7.jpg',   '/history/7.jpg',      'Incendio estructural · Cala Cala',          'Operativo',    1, 1),
    ('history_4.jpg',   '/history/4.jpg',      'Brigada Tunari · 41 días de combate',       'Forestal',     1, 2),
    ('history_9.jpg',   '/history/9.jpg',      'Extracción vehicular · Blanco Galindo',     'Rescate',      1, 3),
    ('history_12.jpg',  '/history/12.jpg',     'Entrenamiento NFPA 1001 · Cuartel central', 'Capacitación', 1, 4),
    ('history_15.jpg',  '/history/15.jpg',     'Escuela bomberil · Quillacollo',            'Comunidad',    1, 5),
    ('history_18.jpg',  '/history/18.jpg',     'Respuesta nocturna · Zona Sur',             'Operativo',    1, 6),
    ('trabajo_rr3.jpg', '/trabajo/rr3.jpg',    'Unidad B-04 en ruta de emergencia',         'Unidad',       1, 7),
    ('history_atoq.png','/history/atoq.png',   'Cuartel Yunka Atoq · Av. Heroínas 1456',   'Cuartel',      1, 8)`);
  console.log('✅ 8 imágenes insertadas.');
} else {
  console.log(`ℹ️  Ya existen ${c} imágenes, sin cambios.`);
}

const [rows] = await pool.query('SELECT id,filename,caption,orden FROM slider_images ORDER BY orden');
console.log(`\nTotal: ${rows.length} imágenes en slider_images`);
rows.forEach(r => console.log(`  ${r.orden}. ${r.filename} — ${r.caption}`));
process.exit(0);
