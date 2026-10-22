import { ESPECIALIDADES } from '../data/especialidades';

export const NOMBRE_FUNDACION='Fundación de Voluntarios de Salvamento, Rescate y Protección Ambiental "Yunka Atoq"';
const normalizar=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const alias:Record<string,string[]>={
  fuego:['fuego','incendio','bombero forestal'],
  'soporte-vital':['soporte vital','primeros auxilios','atencion prehospitalaria','emergencias medicas','paramedico','aph','svb','sva'],
  'busqueda-rescate':['busqueda','usar','rescate vertical','rescate con cuerdas','alta montana','espacios confinados','salvamento'],
  guardianes:['guardianes','rescate animal','rescate de animales','fauna','proteccion ambiental','conservacion ambiental'],
  ciencia:['ciencia','investigacion','tecnologia','desarrollo tecnologico'],
  administracion:['administracion','administrativo','logistica','recursos humanos','finanzas'],
};
/** Vincula únicamente denominaciones reconocidas con las insignias institucionales existentes. */
export function especialidadesCredencial(value?:string|null){
  const texto=normalizar(value??'');
  if(!texto)return [];
  return ESPECIALIDADES.filter(e=>texto.includes(normalizar(e.name))||alias[e.slug]?.some(a=>{
    const key=normalizar(a);return key.length<=3?` ${texto} `.includes(` ${key} `):texto.includes(key);
  })||(e.slug==='busqueda-rescate'&&(value??'').split(/[,;\n]/).some(p=>/^rescate(?! animal| de animales| de fauna)/.test(normalizar(p)))));
}
