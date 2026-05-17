import pool from '../db.js';

await pool.query(`CREATE TABLE IF NOT EXISTS servicios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  numero      VARCHAR(5)    NOT NULL DEFAULT '01',
  titulo      VARCHAR(200)  NOT NULL,
  descripcion TEXT,
  icono       VARCHAR(60)   NOT NULL DEFAULT 'flame',
  capacidades JSON,
  tags        JSON,
  activo      TINYINT(1)    NOT NULL DEFAULT 1,
  orden       INT           NOT NULL DEFAULT 99,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

const [[{ c }]] = await pool.query('SELECT COUNT(*) as c FROM servicios');

if (Number(c) === 0) {
  const servicios = [
    {
      numero: '01', orden: 1, icono: 'building-fire',
      titulo: 'Incendios estructurales',
      descripcion: 'Ataque ofensivo, ventilación táctica y rescate de víctimas en viviendas, comercios e industria.',
      capacidades: JSON.stringify(['Cuerpo de ataque con BA-2026','Aparatos de respiración SCBA','Termocámaras FLIR K53','Tiempo objetivo: 12 min']),
      tags: JSON.stringify(['24/7','Voluntario','Sin costo']),
    },
    {
      numero: '02', orden: 2, icono: 'forest-fire',
      titulo: 'Incendios forestales',
      descripcion: 'Brigada certificada para el Parque Nacional Tunari y zonas rurales. Combate sostenido en interfaz urbano-forestal.',
      capacidades: JSON.stringify(['Líneas de control','Quemas prescritas','Brigada helitransportada','Convenio SERNAP']),
      tags: JSON.stringify(['24/7','Voluntario','Sin costo']),
    },
    {
      numero: '03', orden: 3, icono: 'medical-cross',
      titulo: 'Atención prehospitalaria',
      descripcion: 'Soporte vital básico, manejo de trauma y traslado coordinado con la red de salud pública.',
      capacidades: JSON.stringify(['Ambulancias tipo II','Desfibriladores AED','Protocolo ITLS / PHTLS','Red Hospital Viedma']),
      tags: JSON.stringify(['24/7','Voluntario','Sin costo']),
    },
    {
      numero: '04', orden: 4, icono: 'graduation',
      titulo: 'Capacitación',
      descripcion: 'Formación continua para voluntarios y comunidad: primeros auxilios, prevención de incendios y certificaciones internacionales.',
      capacidades: JSON.stringify(['Certificación NFPA 1001','Cursos de primeros auxilios','Simulacros comunitarios','Capacitación a empresas']),
      tags: JSON.stringify(['Voluntario','Sin costo']),
    },
    {
      numero: '05', orden: 5, icono: 'command',
      titulo: 'Sistema de Comando de Incidentes',
      descripcion: 'Coordinación táctica y estratégica de operaciones complejas bajo el modelo SCI/ICS estandarizado a nivel nacional.',
      capacidades: JSON.stringify(['Modelo ICS/SCI certificado','Coordinación interinstitucional','Sala de situación móvil','Gestión de recursos en campo']),
      tags: JSON.stringify(['24/7','Voluntario','Sin costo']),
    },
    {
      numero: '06', orden: 6, icono: 'search-rescue',
      titulo: 'Búsqueda y rescate',
      descripcion: 'Intervención en estructuras colapsadas, alta montaña y espacios confinados con equipo USAR certificado.',
      capacidades: JSON.stringify(['Equipo USAR certificado','Rescate en altura','Espacios confinados','Canes de búsqueda']),
      tags: JSON.stringify(['24/7','Voluntario','Sin costo']),
    },
  ];

  for (const s of servicios) {
    await pool.query(
      `INSERT INTO servicios (numero,titulo,descripcion,icono,capacidades,tags,activo,orden)
       VALUES (?,?,?,?,?,?,1,?)`,
      [s.numero, s.titulo, s.descripcion, s.icono, s.capacidades, s.tags, s.orden]
    );
  }
  console.log(`✅ ${servicios.length} servicios insertados.`);
} else {
  console.log(`ℹ️  Ya existen ${c} servicios.`);
}

const [rows] = await pool.query('SELECT id,numero,titulo,orden FROM servicios ORDER BY orden');
rows.forEach(r => console.log(`  ${r.numero}. ${r.titulo}`));
process.exit(0);
