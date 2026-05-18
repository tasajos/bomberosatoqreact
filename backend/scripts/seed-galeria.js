import pool from '../db.js';

await pool.query(`CREATE TABLE IF NOT EXISTS galeria (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  src         VARCHAR(500)  NOT NULL,
  label       VARCHAR(200)  DEFAULT '',
  category    VARCHAR(80)   NOT NULL DEFAULT 'General',
  source_type ENUM('upload','url') NOT NULL DEFAULT 'url',
  activo      TINYINT(1)    NOT NULL DEFAULT 1,
  orden       INT           NOT NULL DEFAULT 99,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

const [[{ c }]] = await pool.query('SELECT COUNT(*) as c FROM galeria');

if (Number(c) === 0) {
  const items = [
    ['/history/7.jpg',       'Incendio estructural · Cala Cala',          'Estructurales', 'url', 1],
    ['/history/4.jpg',       'Incendio forestal Tunari',                   'Forestales',    'url', 2],
    ['/history/5.jpg',       'Rescate vehicular · Blanco Galindo',         'Rescate',       'url', 3],
    ['/history/6.jpg',       'Capacitación NFPA',                         'Entrenamiento', 'url', 4],
    ['/history/7.jpg',       'Brigada forestal en acción',                 'Forestales',    'url', 5],
    ['/history/8.jpg',       'Intervención comunidad',                     'Comunidad',     'url', 6],
    ['/history/9.jpg',       'Operativo estructural nocturno',             'Estructurales', 'url', 7],
    ['/history/10.jpg',      'Entrenamiento físico',                       'Entrenamiento', 'url', 8],
    ['/history/12.jpg',      'Incendio forestal · temporada seca',         'Forestales',    'url', 9],
    ['/history/13.jpg',      'Rescate en altura',                          'Rescate',       'url', 10],
    ['/history/15.jpg',      'Jornada comunitaria escolar',                'Comunidad',     'url', 11],
    ['/history/16.jpg',      'Simulacro USAR',                             'Entrenamiento', 'url', 12],
    ['/history/18.jpg',      'Ataque ofensivo · zona sur',                 'Estructurales', 'url', 13],
    ['/trabajo/rr3.jpg',     'Unidad B-04 en ruta',                        'Rescate',       'url', 14],
    ['/trabajo/rrblanco.jpg','Guardia nocturna cuartel',                   'Estructurales', 'url', 15],
    ['/history/atoq.png',    'Cuartel Yunka Atoq · Av. Heroínas 1456',    'Comunidad',     'url', 16],
  ];
  for (const [src, label, category, source_type, orden] of items) {
    await pool.query(
      'INSERT INTO galeria (src,label,category,source_type,activo,orden) VALUES (?,?,?,?,1,?)',
      [src, label, category, source_type, orden]
    );
  }
  console.log(`✅ ${items.length} imágenes insertadas en galeria.`);
} else {
  console.log(`ℹ️  Ya existen ${c} imágenes.`);
}
const [rows] = await pool.query('SELECT id,label,category FROM galeria ORDER BY orden LIMIT 5');
rows.forEach(r => console.log(`  [${r.category}] ${r.label}`));
process.exit(0);
