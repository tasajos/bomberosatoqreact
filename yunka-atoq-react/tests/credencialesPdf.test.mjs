import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

test('PDF frente/reverso con tamaño de corte, sangrado, QR y datos largos',async t=>{
  const server=await createServer({server:{middlewareMode:true},logLevel:'silent'});t.after(()=>server.close());
  const {crearCredencialPDF}=await server.ssrLoadModule('/src/utils/credencialesPdf.ts');
  const {especialidadesCredencial}=await server.ssrLoadModule('/src/utils/especialidadesCredencial.ts');
  const {ESPECIALIDADES}=await server.ssrLoadModule('/src/data/especialidades.ts');
  const insignias=Object.fromEntries(await Promise.all(ESPECIALIDADES.map(async e=>[e.slug,`data:image/png;base64,${(await readFile(new URL(`../public${e.img}`,import.meta.url))).toString('base64')}`])));
  const logo=`data:image/png;base64,${(await readFile(new URL('../public/yunka_atoq_transparente.png',import.meta.url))).toString('base64')}`;
  const foto=`data:image/jpeg;base64,${(await readFile(new URL('./fixtures/credencial-foto.jpg',import.meta.url))).toString('base64')}`;
  const registro={id:1,codigo:'CREDYA-000001',estado:'pendiente',fecha_emision:'2026-10-21',fecha_vencimiento:'2027-10-21',
    verificacion_path:`/credenciales/verificar/${'a'.repeat(64)}`,datos:{nombre:'ANA MARÍA LÓPEZ MAMANI',codigo_voluntario:'VF-001',tipo_sangre:'O+',
      especialidad:'Incendios forestales, Búsqueda y rescate, Primeros auxilios',funcion:'Voluntaria de rescate',grado:'vol_1ro',foto}};
  const url=`https://bomberosatoq.org${registro.verificacion_path}`;
  const recursos={logo,especialidades:insignias};
  assert.deepEqual(especialidadesCredencial(registro.datos.especialidad).map(e=>e.slug),['fuego','soporte-vital','busqueda-rescate']);
  assert.deepEqual(especialidadesCredencial('Rescate animal').map(e=>e.slug),['guardianes']);
  assert.equal(especialidadesCredencial('').length,0);
  assert.equal(especialidadesCredencial('Otra especialidad').length,0);
  const pdf=await crearCredencialPDF(registro,url,recursos);
  assert.equal(pdf.getNumberOfPages(),2);assert.ok(Math.abs(pdf.internal.pageSize.getWidth()-60)<0.01);assert.ok(Math.abs(pdf.internal.pageSize.getHeight()-91.6)<0.01);
  const trim=pdf.getCurrentPageInfo().pageContext.trimBox;assert.ok(Math.abs((trim.topRightX-trim.bottomLeftX)*25.4/72-54)<0.01);
  assert.ok(Math.abs((trim.topRightY-trim.bottomLeftY)*25.4/72-85.6)<0.01);
  assert.ok(pdf.output('arraybuffer').byteLength<5_000_000,'El PDF debe caber en el límite de carga del servidor');
  await assert.rejects(crearCredencialPDF(registro,'javascript:alert(1)',recursos),/verificación/);
  const largo=await crearCredencialPDF({...registro,datos:{...registro.datos,nombre:'MARÍA FERNANDA DE LOS ÁNGELES FLORES CÉSPEDES',funcion:'Jefa de Operaciones y Coordinación de Emergencias',especialidad:'Salvamento, rescate y protección ambiental'}},url,recursos);
  assert.equal(largo.getNumberOfPages(),2);
  const sinEspecialidades=await crearCredencialPDF({...registro,datos:{...registro.datos,especialidad:''}},url,recursos);
  assert.equal(sinEspecialidades.getNumberOfPages(),2);
  const todas=await crearCredencialPDF({...registro,datos:{...registro.datos,especialidad:'Fuego, Soporte Vital, Búsqueda y Rescate, Guardianes de la Naturaleza, Ciencia e Investigación, Administración'}},url,recursos);
  assert.ok(todas.output('arraybuffer').byteLength<5_000_000,'Las seis insignias deben caber en el límite del servidor');
  await mkdir(new URL('../../output/pdf/',import.meta.url),{recursive:true});
  await writeFile(new URL('../../output/pdf/credencial_ejemplo.pdf',import.meta.url),Buffer.from(pdf.output('arraybuffer')));
  await writeFile(new URL('../../tmp/pdfs/credencial_nombres_largos.pdf',import.meta.url),Buffer.from(largo.output('arraybuffer')));
  await writeFile(new URL('../../tmp/pdfs/credencial_todas_especialidades.pdf',import.meta.url),Buffer.from(todas.output('arraybuffer')));
});
