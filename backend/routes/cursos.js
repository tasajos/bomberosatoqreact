import { Router } from 'express';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { enviarCorreo } from '../mailer.js';
import { crearServicioCursos, esGestion } from '../services/cursos.js';

// Límite por IP para el registro e ingreso públicos de participantes externos.
function limitador(max, ventanaMs) {
  const visitas = new Map();
  return (req, res, next) => {
    const ahora = Date.now(), clave = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
    const v = visitas.get(clave);
    if (!v || v.reinicio < ahora) visitas.set(clave, { n: 1, reinicio: ahora + ventanaMs });
    else if (++v.n > max) return res.status(429).json({ error: 'Demasiados intentos. Espere unos minutos e intente nuevamente.' });
    if (visitas.size > 5000) for (const [k, x] of visitas) if (x.reinicio < ahora) visitas.delete(k);
    next();
  };
}
const disposicion = (nombre, enLinea) =>
  `${enLinea ? 'inline' : 'attachment'}; filename="${nombre.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '')}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;

export function crearRouterCursos(servicio = crearServicioCursos({ pool, enviarCorreo,
  storageDir: fileURLToPath(new URL('../storage/cursos/', import.meta.url)),
  certificadosDir: fileURLToPath(new URL('../storage/certificados/', import.meta.url)) }), db = pool) {
  const router = Router();
  const maxMb = Math.max(1, Number(process.env.CURSOS_MAX_MB) || 300);
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => servicio.init().then(() => cb(null, servicio.directorio), cb),
      filename: (_req, file, cb) => cb(null, `${randomBytes(16).toString('hex')}${path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '')}`),
    }),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
  });
  const wrap = fn => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };
  const json = fn => wrap(async (req, res) => res.json(await fn(req)));
  router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); res.set('X-Content-Type-Options', 'nosniff'); next(); });

  // ── Público: catálogo, registro e ingreso de externos, archivos con enlace firmado ──
  router.get('/publico', json(async () => ({ data: await servicio.catalogoPublico() })));
  router.get('/publico/:id', json(req => servicio.detallePublico(req.params.id)));
  // El registro no inicia sesión: la cuenta se activa al confirmar el correo con el enlace enviado.
  router.post('/publico/registro', limitador(30, 15 * 60 * 1000), wrap(async (req, res) => res.status(201).json(await servicio.registrar(req.body))));
  router.post('/publico/verificar', limitador(60, 15 * 60 * 1000), json(req => servicio.verificarCorreo(req.body?.token)));
  router.post('/publico/reenviar', limitador(10, 15 * 60 * 1000), json(req => servicio.reenviarVerificacion(req.body?.email)));
  router.post('/publico/ingresar', limitador(30, 15 * 60 * 1000), json(async req => {
    const cuenta = await servicio.ingresar(req.body?.email, req.body?.password);
    return { token: servicio.firmarSesion(cuenta), cuenta };
  }));
  router.get('/archivo/:token/:nombre?', wrap(async (req, res) => {
    const a = await servicio.archivo(req.params.token);
    res.set('Cache-Control', 'private, max-age=3600');
    res.set('Content-Disposition', disposicion(a.nombre, a.enLinea));
    res.sendFile(a.ruta, { headers: { 'Content-Type': a.tipo } }, e => { if (e && !res.headersSent) res.status(404).json({ error: 'Archivo no disponible.' }); });
  }));

  // ── Sesión: miembros de la fundación (token institucional) o cuentas externas (token de cursos) ──
  router.use(async (req, res, next) => {
    try {
      const token = String(req.headers.authorization || '').split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Inicie sesión para continuar.' });
      let datos = null;
      try { datos = jwt.verify(token, process.env.JWT_SECRET); } catch { datos = null; }
      if (datos?.id) {
        const [[u]] = await db.query('SELECT id,role,activo,nombre FROM users WHERE id=?', [datos.id]);
        if (!u?.activo) return res.status(403).json({ error: 'Usuario inactivo.' });
        req.actor = { tipo: 'usuario', id: u.id, role: u.role, nombre: u.nombre };
        return next();
      }
      const cuenta = await servicio.cuentaDeToken(token);
      if (!cuenta) return res.status(403).json({ error: 'Sesión inválida o expirada. Vuelva a ingresar.' });
      req.actor = { tipo: 'cuenta', id: cuenta.id, nombre: cuenta.nombre, cuenta };
      next();
    } catch (e) { next(e); }
  });
  router.get('/yo', json(async req => ({ tipo: req.actor.tipo, nombre: req.actor.nombre, cuenta: req.actor.cuenta ?? null,
    gestion: esGestion(req.actor), ...(await servicio.resumen(req.actor)) })));
  router.put('/yo/password', json(req => servicio.cambiarPassword(req.actor, req.body?.actual, req.body?.nueva)));

  // ── Participantes ──
  router.get('/aula', json(req => servicio.catalogo(req.actor)));
  router.get('/aula/:id', json(req => servicio.aula(req.actor, req.params.id)));
  router.post('/aula/:id/inscripcion', json(req => servicio.inscribirse(req.actor, req.params.id, req.body)));
  router.put('/aula/:id/pago', json(req => servicio.registrarPago(req.actor, req.params.id, req.body)));
  router.get('/aula/:id/certificado', wrap(async (req, res) => {
    const c = await servicio.certificadoArchivo(req.actor, req.params.id);
    res.download(c.ruta, c.nombre, e => { if (e && !res.headersSent) res.status(404).json({ error: 'Archivo no disponible.' }); });
  }));
  router.get('/materiales/:id/contenido', json(req => servicio.contenido(req.actor, req.params.id)));
  router.get('/examenes/:id', json(req => servicio.examenParaRendir(req.actor, req.params.id)));
  router.post('/examenes/:id/intentos', json(req => servicio.rendir(req.actor, req.params.id, req.body?.respuestas)));

  // ── Instructor del curso (o presidencia) ──
  router.get('/dictar', json(async req => ({ data: await servicio.cursosDictados(req.actor) })));
  router.get('/dictar/:id', json(req => servicio.detalleStaff(req.actor, req.params.id)));
  router.get('/dictar/:id/participantes', json(req => servicio.participantes(req.actor, req.params.id)));
  router.post('/dictar/:id/modulos', json(req => servicio.crearModulo(req.actor, req.params.id, req.body)));
  router.post('/dictar/:id/examenes', json(req => servicio.guardarExamen(req.actor, { cursoId: req.params.id }, req.body)));
  router.put('/modulos/:id', json(req => servicio.actualizarModulo(req.actor, req.params.id, req.body)));
  router.delete('/modulos/:id', json(req => servicio.eliminarModulo(req.actor, req.params.id)));
  router.post('/modulos/:id/mover', json(req => servicio.moverModulo(req.actor, req.params.id, req.body?.direccion)));
  router.post('/modulos/:id/materiales', (req, _res, next) => servicio.permisoModulo(req.actor, req.params.id).then(() => next(), next),
    upload.single('archivo'),
    json(req => servicio.crearMaterial(req.actor, req.params.id, req.body, req.file)));
  router.put('/materiales/:id', json(req => servicio.actualizarMaterial(req.actor, req.params.id, req.body)));
  router.delete('/materiales/:id', json(req => servicio.eliminarMaterial(req.actor, req.params.id)));
  router.post('/materiales/:id/mover', json(req => servicio.moverMaterial(req.actor, req.params.id, req.body?.direccion)));
  router.put('/examenes/:id', json(req => servicio.guardarExamen(req.actor, { examenId: req.params.id }, req.body)));
  router.delete('/examenes/:id', json(req => servicio.eliminarExamen(req.actor, req.params.id)));

  // ── Presidencia ──
  router.use('/gestion', (req, res, next) => esGestion(req.actor) ? next() : res.status(403).json({ error: 'Acceso exclusivo de presidencia.' }));
  router.get('/gestion', json(async () => ({ data: await servicio.listarGestion() })));
  router.get('/gestion/opciones', json(() => servicio.opciones()));
  router.get('/gestion/cuentas', json(async () => ({ data: await servicio.listarCuentas() })));
  router.delete('/gestion/cuentas/:id', json(req => servicio.eliminarCuenta(req.params.id)));
  router.post('/gestion', wrap(async (req, res) => res.status(201).json(await servicio.crear(req.body, req.actor.id))));
  router.put('/gestion/:id', json(req => servicio.actualizar(req.params.id, req.body)));
  router.delete('/gestion/:id', json(req => servicio.eliminar(req.params.id)));
  router.post('/gestion/instructores', json(req => servicio.crearInstructorExterno(req.body, req.actor.id)));
  router.post('/gestion/cuentas/:id/password', json(req => servicio.restablecerPassword(req.params.id)));
  router.put('/gestion/inscripciones/:id', json(req => servicio.revisarInscripcion(req.params.id, req.body, req.actor.id)));
  router.get('/gestion/inscripciones/:id/certificado', json(req => servicio.datosCertificado(req.params.id)));
  router.put('/gestion/inscripciones/:id/certificado', json(req => servicio.vincularCertificado(req.params.id, req.body?.certificado_id)));

  router.use((e, _req, res, _next) => {
    if (e instanceof multer.MulterError) return res.status(400).json({ error: e.code === 'LIMIT_FILE_SIZE' ? `El archivo supera ${maxMb} MB.` : 'Archivo inválido.' });
    if (!e.status) console.error('Cursos:', e.code || '', e.sqlMessage || e.message);
    res.status(e.status || 500).json(e.status ? { error: e.message, ...(e.codigo ? { codigo: e.codigo } : {}) }
      : { error: 'No se pudo procesar la solicitud de cursos.', codigo: String(e.code || e.errno || 'ERROR') });
  });
  return router;
}
export default crearRouterCursos();
