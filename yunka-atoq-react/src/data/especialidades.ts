// Especialidades de la compañía. Fuente única para la home y la página de servicios.

export interface Especialidad {
  slug: string;
  name: string;
  img: string;
  /** Resumen corto (tarjetas de la home) */
  desc: string;
  /** Descripción ampliada (página de servicios) */
  lead: string;
  /** Áreas de trabajo de la unidad */
  areas: string[];
  /** Iconos de servicio (`servicios.icono`) con los que se relaciona */
  servicios: string[];
}

export const ESPECIALIDADES: Especialidad[] = [
  {
    slug: 'fuego',
    name: 'Fuego',
    img: '/especialidades/FuegoYA.png',
    desc: 'Ataque, control y extinción de incendios estructurales, vehiculares y forestales',
    lead: 'La unidad de primera línea. Entrena ataque ofensivo y defensivo, ventilación táctica y control de incendios en vivienda, comercio, vehículos e interfaz urbano-forestal.',
    areas: [
      'Incendios estructurales y vehiculares',
      'Combate forestal y líneas de control',
      'Ventilación y búsqueda primaria',
      'Protección de exposiciones y remoción',
    ],
    servicios: ['building-fire', 'forest-fire'],
  },
  {
    slug: 'soporte-vital',
    name: 'Soporte Vital',
    img: '/especialidades/SoporteVitalYA.png',
    desc: 'Atención prehospitalaria, soporte vital básico y avanzado, trauma y traslado con convenio Hospital Viedma.',
    lead: 'Estabiliza a pacientes en la escena y durante el traslado. Trabaja en coordinación con el Hospital Viedma y la red de salud departamental.',
    areas: [
      'Soporte vital básico y avanzado',
      'Atención de trauma y triaje (START)',
      'Traslado y entrega hospitalaria',
      'Cobertura sanitaria en eventos masivos',
    ],
    servicios: ['medical-cross'],
  },
  {
    slug: 'busqueda-rescate',
    name: 'Búsqueda y Rescate',
    img: '/especialidades/busqueda_rescate.png',
    desc: 'Rescate en estructuras colapsadas, alta montaña y espacios confinados.',
    lead: 'Localiza y extrae personas en entornos de difícil acceso, desde estructuras colapsadas hasta quebradas y alta montaña.',
    areas: [
      'Estructuras colapsadas (USAR)',
      'Rescate vertical y con cuerdas',
      'Espacios confinados',
      'Búsqueda de personas extraviadas',
    ],
    servicios: ['search-rescue'],
  },
  {
    slug: 'guardianes',
    name: 'Guardianes de la Naturaleza',
    img: '/especialidades/rescate_animal.png',
    desc: 'Rescate animal, conservación ambiental e intervención en ecosistemas afectados por incendios o desastres.',
    lead: 'Protege la fauna y los ecosistemas del departamento: rescata animales en riesgo y apoya la recuperación de zonas afectadas por incendios.',
    areas: [
      'Rescate y manejo de fauna doméstica y silvestre',
      'Restauración de áreas afectadas',
      'Educación ambiental comunitaria',
      'Prevención de incendios forestales',
    ],
    servicios: ['forest-fire'],
  },
  {
    slug: 'ciencia',
    name: 'Ciencia e Investigación',
    img: '/especialidades/ciencia_inve_tecn.png',
    desc: 'Desarrollo tecnológico, investigación aplicada y formación científica para mejorar la respuesta operativa.',
    lead: 'Convierte datos y tecnología en mejores decisiones operativas: analiza incidentes, desarrolla herramientas y apoya la formación técnica.',
    areas: [
      'Análisis de datos operativos',
      'Mapeo y sistemas de información geográfica',
      'Desarrollo de herramientas tecnológicas',
      'Investigación aplicada y capacitación',
    ],
    servicios: ['graduation'],
  },
  {
    slug: 'administracion',
    name: 'Administración',
    img: '/especialidades/Administracion.png',
    desc: 'Gestión institucional, logística operativa, recursos humanos y coordinación de la compañía.',
    lead: 'Sostiene a la compañía detrás de cada salida: logística, equipamiento, personal y coordinación con instituciones aliadas.',
    areas: [
      'Logística y control de equipamiento',
      'Gestión de voluntarios y recursos humanos',
      'Coordinación interinstitucional',
      'Soporte al Sistema de Comando de Incidentes',
    ],
    servicios: ['command'],
  },
];
