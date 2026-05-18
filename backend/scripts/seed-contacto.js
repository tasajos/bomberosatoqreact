import pool from '../db.js';

// Tabla de solicitudes de contacto
await pool.query(`CREATE TABLE IF NOT EXISTS contactos (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(150) NOT NULL,
  correo     VARCHAR(200) NOT NULL,
  telefono   VARCHAR(30),
  tema       VARCHAR(100),
  mensaje    TEXT NOT NULL,
  leido      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

// Tabla de configuración general del sitio
await pool.query(`CREATE TABLE IF NOT EXISTS configuracion (
  clave  VARCHAR(100) PRIMARY KEY,
  valor  TEXT NOT NULL,
  label  VARCHAR(200)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

// Insertar configuración por defecto de la ubicación
const defaults = [
  ['cuartel_nombre',    'Cuartel Yunka Atoq',                'Nombre del cuartel'],
  ['cuartel_direccion', 'Av. Heroínas #1456',                'Dirección'],
  ['cuartel_barrio',    'Cercado · Cochabamba',              'Barrio / Ciudad'],
  ['cuartel_telefono',  '+591 4 422 0000',                   'Teléfono de atención'],
  ['cuartel_horario',   'Lunes a viernes · 8:00 – 18:00',   'Horario de atención'],
  ['cuartel_emergencias','68503758',                         'Número de emergencias'],
  ['cuartel_email',     'informaciones@bomberosatoq.org',    'Email de contacto'],
  ['cuartel_lat',       '-17.393500',                        'Latitud (Google Maps)'],
  ['cuartel_lng',       '-66.156800',                        'Longitud (Google Maps)'],
];

for (const [clave, valor, label] of defaults) {
  await pool.query(
    'INSERT IGNORE INTO configuracion (clave, valor, label) VALUES (?,?,?)',
    [clave, valor, label]
  );
}

console.log('✅ Tablas contactos y configuracion listas.');
const [rows] = await pool.query('SELECT clave, valor FROM configuracion');
rows.forEach(r => console.log(`  ${r.clave} = ${r.valor}`));
process.exit(0);
