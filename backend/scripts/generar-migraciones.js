// Genera services/migracionesSql.js con el contenido de los scripts SQL que el backend aplica al iniciar.
// Así el servidor no depende de que la carpeta scripts/ se despliegue. Ejecutar tras modificar un .sql:
//   npm run sql:generar
import { readFile, writeFile } from 'node:fs/promises';

export const SCRIPTS_RUNTIME = [
  '18_finanzas_logistica.sql', '19_finanzas_comprobantes.sql', '20_finanzas_mensualidades.sql',
  '21_finanzas_deudas_conceptos.sql', '22_logistica_actas_tipos.sql', '23_personal_gestion.sql', '24_personal_reglamento.sql',
  '26_conceptos_guardias.sql', '27_credenciales.sql', '28_credenciales_diseno.sql',
];

export async function contenidoModulo() {
  const entradas = [];
  for (const nombre of SCRIPTS_RUNTIME) entradas.push([nombre, await readFile(new URL(`./${nombre}`, import.meta.url), 'utf8')]);
  return `// Archivo generado por scripts/generar-migraciones.js (npm run sql:generar). No editar a mano:\n`
    + `// la fuente oficial son los .sql de scripts/, que también sirven para replicar en producción.\n`
    + `export const SQL = ${JSON.stringify(Object.fromEntries(entradas), null, 1)};\n`
    + `export function sql(nombre) {\n  const texto = SQL[nombre];\n  if (texto === undefined) throw Object.assign(new Error(\`Script no incluido: \${nombre}\`), { code: 'SCRIPT_NO_INCLUIDO' });\n  return texto;\n}\n`;
}

if (import.meta.url === new URL(process.argv[1], 'file:///').href || process.argv[1]?.endsWith('generar-migraciones.js')) {
  await writeFile(new URL('../services/migracionesSql.js', import.meta.url), await contenidoModulo());
  console.log(`services/migracionesSql.js generado con ${SCRIPTS_RUNTIME.length} scripts.`);
}
