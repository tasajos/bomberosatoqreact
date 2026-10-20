import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { jsPDF } from 'jspdf';

test('prepara recursos una vez, reintenta logos faltantes y valida sin incrustar imágenes', async t => {
  const server = await createServer({ server:{middlewareMode:true}, logLevel:'silent' });
  t.after(()=>server.close());
  const fetchAnterior = globalThis.fetch, storageAnterior = globalThis.localStorage;
  const procesarPNG = jsPDF.API.processPNG;
  t.after(()=>{
    globalThis.fetch = fetchAnterior;
    if (storageAnterior === undefined) delete globalThis.localStorage; else globalThis.localStorage = storageAnterior;
    jsPDF.API.processPNG = procesarPNG;
  });
  const peticiones = new Map();
  let faltaLogo = true, imagenesProcesadas = 0;
  globalThis.localStorage = {getItem:()=>null};
  globalThis.fetch = async url => {
    if (String(url).includes('/cabecera')) return Response.json({cabecera:null});
    peticiones.set(url,(peticiones.get(url)||0)+1);
    if (url === '/yunka_atoq_transparente.png' && faltaLogo) {
      faltaLogo = false;
      return new Response('<html>SPA</html>',{headers:{'Content-Type':'text/html'}});
    }
    const bytes = await readFile(new URL(`../public${url}`,import.meta.url));
    return new Response(bytes,{headers:{'Content-Type':'image/png'}});
  };
  jsPDF.API.processPNG = function(...args) {
    imagenesProcesadas++;
    return procesarPNG.apply(this,args);
  };
  const util = await server.ssrLoadModule('/src/utils/certificadosPdf.ts');
  await assert.rejects(util.prepararRecursosCertificado(),/Falta el logo/);
  await Promise.all([util.prepararRecursosCertificado(),util.prepararRecursosCertificado()]);
  assert.equal(peticiones.get('/yunka_atoq_transparente.png'),2);
  assert.equal(peticiones.get('/oba_logo.png'),1);
  const datos = {...util.datosCertificadoVacios(), participante:'Ana María López', curso:'Primeros auxilios', horas:'40',
    fechaInicio:'2026-10-19',fechaFin:'2026-10-20',fechaEmision:'2026-10-20',presidente:'Presidente',
    instructor:'Instructor',temario:'Seguridad y bioseguridad\nSoporte vital básico\nPrácticas supervisadas'};
  await util.validarDisenoCertificado(datos);
  assert.equal(imagenesProcesadas,0,'La validación no debe procesar los PNG del PDF');
  const pdf = await util.crearCertificadoPDF({...datos,codigo:'CRTYA-100'},
    {urlVerificacion:`https://bomberosatoq.org/certificados/verificar/${'a'.repeat(64)}`});
  assert.equal(pdf.getNumberOfPages(),2);
  assert.ok(pdf.internal.pageSize.width > pdf.internal.pageSize.height);
  assert.equal(imagenesProcesadas,3,'Cada logo y el QR se procesan una sola vez para ambas caras');
  assert.ok(pdf.output('arraybuffer').byteLength < 2_000_000,'El PDF conserva la compresión de las imágenes');
  await assert.rejects(util.validarDisenoCertificado({...datos,temario:'Procedimientos y prácticas de rescate\n'.repeat(150)}),/El temario no cabe/);
  await util.crearCertificadoPDF({...datos,instructor:'',cargoInstructor:'',incluirQR:false});
  assert.equal(peticiones.get('/yunka_atoq_transparente.png'),2);
  assert.equal(peticiones.get('/oba_logo.png'),1);
});
