// Plantillas de Resolución Jefatural basadas en el Estatuto Orgánico de la
// Fundación Yunka Atoq. El presidente elige un motivo y el sistema
// autocompleta VISTOS / CONSIDERANDO / RESUELVE; todo queda editable.

export type MotivoResolucion = {
  id: string;
  label: string;
  vistos: string;
  considerandos: string[];
  articulo: { titulo: string; texto: string };
};

const BASE = 'El Estatuto Orgánico de la Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental "Yunka Atoq"';

export const MOTIVOS_RESOLUCION: MotivoResolucion[] = [
  {
    id: 'comision',
    label: 'Designación de comisión de trabajo',
    vistos: `${BASE}, en su Artículo 109 (Ejecución de Operaciones), que faculta al Presidente de la Fundación, como máxima autoridad institucional, a designar comisiones de trabajo para la gestión eficiente de la institución.`,
    considerandos: [
      'el Presidente de la Fundación y Representante Legal, en uso de sus atribuciones conferidas en el marco de la ley y estatutos en vigencia, tiene la potestad de crear comisiones de trabajo para la gestión eficiente y transparente de la institución.',
    ],
    articulo: {
      titulo: 'DESIGNAR AL PERSONAL PARA LA COMISIÓN',
      texto: 'Que en base a méritos propios de los voluntarios, la operatividad y calidad de cada uno de los mismos, se designa al siguiente personal:',
    },
  },
  {
    id: 'ascenso',
    label: 'Ascenso de grado jerárquico',
    vistos: `${BASE}, en sus Artículos 72 (Obtención y Acreditación del Grado Jerárquico), 73 (De los Ascensos) y 75 (Antigüedad Mínima en el Grado Jerárquico Precedente), que regulan el procedimiento y los requisitos de ascenso de los voluntarios.`,
    considerandos: [
      'el voluntario propuesto cumple con la antigüedad mínima en el grado precedente y con los requisitos de capacitación y aptitud física establecidos en los Artículos 74 al 84 del Estatuto Orgánico para acceder al grado jerárquico inmediato superior.',
      'los ascensos tienen por finalidad reconocer la capacidad técnica, dedicación y responsabilidad del voluntario, conforme al Artículo 73 del Estatuto Orgánico.',
    ],
    articulo: {
      titulo: 'OTORGAR EL ASCENSO AL GRADO DE [GRADO]',
      texto: 'Confiérase el ascenso al grado jerárquico inmediato superior al(los) siguiente(s) voluntario(s), por cumplir con los requisitos y la antigüedad establecidos en el Estatuto Orgánico:',
    },
  },
  {
    id: 'comite_electoral',
    label: 'Creación de Comité Electoral Departamental',
    vistos: `${BASE}, en su Artículo 111 (Comité de Elecciones Departamental), que establece la creación de dicho comité con el propósito de asegurar elecciones claras y transparentes para la elección de Coordinador Departamental.`,
    considerandos: [
      'es necesario garantizar un proceso electoral claro y transparente para la elección de Coordinador Departamental, conforme al Artículo 111 del Estatuto Orgánico.',
    ],
    articulo: {
      titulo: 'CREAR EL COMITÉ ELECTORAL DEPARTAMENTAL',
      texto: 'Créase el Comité Electoral Departamental, conformado por el siguiente personal, con el encargo de conducir el proceso eleccionario correspondiente:',
    },
  },
  {
    id: 'comite_registro_companias',
    label: 'Comité de Registro de Compañías de Voluntarios',
    vistos: `${BASE}, en su Artículo 112 (Comité de Registros de Compañías de Voluntarios Departamentales), que establece la creación de dicho comité, integrado por Voluntarios Fundadores y Coordinadores General y Departamentales.`,
    considerandos: [
      'es necesario contar con procedimientos claros para el registro de nuevas compañías, brigadas y unidades dependientes de la Fundación, velando por la integridad y buena imagen de la institución.',
    ],
    articulo: {
      titulo: 'CONFORMAR EL COMITÉ DE REGISTRO DE COMPAÑÍAS',
      texto: 'Confórmese el Comité de Registros de Compañías de Voluntarios Departamentales con el siguiente personal:',
    },
  },
  {
    id: 'designar_coordinador',
    label: 'Designación o remoción del Coordinador General / oficiales',
    vistos: `${BASE}, en su Artículo 109 (Ejecución de Operaciones), que establece que el Presidente de la Fundación, como máxima autoridad institucional, podrá designar y remover a Coordinadores Generales, Coordinadores Departamentales y oficiales, así como reformular la directiva de forma inmediata cuando lo considere necesario por el bien de la institución.`,
    considerandos: [
      'por el bien de la institución y en uso de las atribuciones conferidas por el Artículo 109 del Estatuto Orgánico, corresponde formalizar la presente designación (o remoción).',
    ],
    articulo: {
      titulo: 'DESIGNAR (O REMOVER) AL COORDINADOR GENERAL',
      texto: 'Desígnese (o remuévase), a partir de la fecha, en el cargo que se detalla, al siguiente personal:',
    },
  },
  {
    id: 'sancion_disciplinaria',
    label: 'Sanción o baja disciplinaria inmediata',
    vistos: `${BASE}, en sus Artículos 107 (Sanción Inmediata) y 108 (Baja Directa e Inmediata), que facultan al Representante Legal y Presidente de la Fundación a aplicar de forma inmediata la suspensión o baja del voluntario que incurra en las conductas allí previstas.`,
    considerandos: [
      'se ha verificado una conducta que amerita la aplicación inmediata de una medida disciplinaria, conforme a las causales previstas en los Artículos 107 y 108 del Estatuto Orgánico, siendo tuición del Presidente de la Fundación disponer dicha sanción.',
    ],
    articulo: {
      titulo: 'APLICAR LA SANCIÓN DISCIPLINARIA',
      texto: 'Aplíquese la siguiente sanción disciplinaria de forma inmediata al voluntario que se detalla, disponiendo las acciones posteriores que correspondan:',
    },
  },
  {
    id: 'condecoracion',
    label: 'Otorgamiento de condecoración o reconocimiento',
    vistos: `${BASE}, en sus Artículos 64 (Reconocimiento) y 65 (Condecoraciones), que facultan a la Fundación a otorgar la condecoración "DIOS - LEALTAD - SOLIDARIDAD" a los voluntarios que merezcan reconocimiento a su esfuerzo, dedicación y comportamiento individual, siendo el Presidente de la Fundación el Canciller de la Orden.`,
    considerandos: [
      'el voluntario propuesto ha demostrado dedicación y colaboración sobresaliente en el servicio activo, conforme a la evaluación de su Hoja de Servicios, según lo establecido en el Artículo 64 del Estatuto Orgánico.',
    ],
    articulo: {
      titulo: 'OTORGAR LA CONDECORACIÓN',
      texto: 'Otórguese la condecoración "Dios - Lealtad - Solidaridad", en el grado que se detalla, al(los) siguiente(s) voluntario(s):',
    },
  },
  {
    id: 'autorizacion_gasto',
    label: 'Autorización de gasto mayor o contrato',
    vistos: `${BASE}, en sus Artículos 88 (Norma para el Manejo y Administración de Recursos) y 110 (Bienes, Contratos y Acuerdos), que establecen que todos los gastos deben ser autorizados por el Presidente y que los gastos mayores deben ser consultados y aprobados por el Directorio.`,
    considerandos: [
      'es necesario autorizar el gasto (o la suscripción del contrato/convenio) que se detalla, por convenir a los intereses institucionales, contando con el respaldo de los comprobantes respectivos conforme al Artículo 88 del Estatuto Orgánico.',
    ],
    articulo: {
      titulo: 'AUTORIZAR EL GASTO O CONTRATO',
      texto: 'Autorícese el siguiente gasto (o la suscripción del contrato/convenio) a favor de la Fundación:',
    },
  },
  {
    id: 'cooperador',
    label: 'Incorporación de Voluntario Cooperador',
    vistos: `${BASE}, en su Artículo 14 (Incorporación del Voluntario Cooperador), que establece que dicha incorporación se formaliza mediante Resolución Jefatural.`,
    considerandos: [
      'el (los) postulante(s) ha(n) cumplido con los requisitos establecidos en el Artículo 13 del Estatuto Orgánico para su incorporación como Voluntario(s) Cooperador(es) de la Fundación.',
    ],
    articulo: {
      titulo: 'INCORPORAR AL VOLUNTARIO COOPERADOR',
      texto: 'Incorpórese como Voluntario(s) Cooperador(es) de la Fundación a:',
    },
  },
  {
    id: 'asimilado',
    label: 'Incorporación de Voluntario Asimilado',
    vistos: `${BASE}, en su Artículo 18 (Incorporación del Voluntario Asimilado), que establece que el ingreso se formaliza mediante Resolución Jefatural.`,
    considerandos: [
      'el (los) postulante(s) ha(n) cumplido con los requisitos establecidos en el Artículo 17 del Estatuto Orgánico y ha(n) sido calificado(s) APTO(S) por el órgano competente de la Fundación.',
    ],
    articulo: {
      titulo: 'INCORPORAR AL VOLUNTARIO ASIMILADO',
      texto: 'Incorpórese como Voluntario(s) Asimilado(s) de la Fundación a:',
    },
  },
  {
    id: 'reincorporacion',
    label: 'Reincorporación al servicio',
    vistos: `${BASE}, en su Artículo 100 (Reincorporación al Servicio), que establece que la reincorporación se formaliza mediante Resolución Jefatural, previa opinión favorable del Coordinador General.`,
    considerandos: [
      'el voluntario ha presentado solicitud escrita de reingreso, sustentando los motivos de su alejamiento y las razones que impulsan su reincorporación, conforme al Artículo 100 del Estatuto Orgánico.',
      'se ha aprobado la evaluación de la solicitud a cargo del Consejo Nacional de Disciplina y la evaluación técnico operativa a cargo de la Jefatura de Operaciones.',
    ],
    articulo: {
      titulo: 'REINCORPORAR AL SERVICIO ACTIVO',
      texto: 'Reincorpórese al servicio activo de la Fundación, en el mismo nivel jerárquico que ostentaba, al (los) siguiente(s) voluntario(s):',
    },
  },
  {
    id: 'baja_fallecimiento',
    label: 'Baja por fallecimiento',
    vistos: `${BASE}, en su Artículo 99 (Baja por Fallecimiento), que establece que se emitirá la Resolución Jefatural de baja correspondiente.`,
    considerandos: [
      'con hondo pesar se ha tomado conocimiento del fallecimiento del voluntario en situación de actividad, correspondiendo formalizar su baja institucional conforme al Artículo 99 del Estatuto Orgánico.',
    ],
    articulo: {
      titulo: 'DAR DE BAJA POR FALLECIMIENTO',
      texto: 'Dese de baja institucional, por fallecimiento, al siguiente voluntario, declarándose vacante el cargo que ocupaba en la estructura orgánica:',
    },
  },
  {
    id: 'reglamento',
    label: 'Aprobación de reglamento interno',
    vistos: `${BASE}, que en su Capítulo VI faculta al Directorio y al Presidente de la Fundación a normar los aspectos internos de funcionamiento de la institución.`,
    considerandos: [
      'es necesario reglamentar de manera clara y equitativa el funcionamiento interno de la institución en la materia que se detalla en el presente instrumento.',
    ],
    articulo: {
      titulo: 'APROBAR EL REGLAMENTO',
      texto: 'Apruébese el reglamento interno adjunto al presente documento.',
    },
  },
  {
    id: 'personalizada',
    label: 'Personalizada (en blanco)',
    vistos: '',
    considerandos: [''],
    articulo: { titulo: '', texto: '' },
  },
];
