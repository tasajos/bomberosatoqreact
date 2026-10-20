import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { crearServicioCertificados, informacionPublicaCertificado } from '../services/certificados.js';

export function crearRouterCertificados(servicio = crearServicioCertificados({
  pool, storageDir:fileURLToPath(new URL('../storage/certificados/', import.meta.url)),
})) {
  const router = Router();
  const upload = multer({ storage:multer.memoryStorage(), limits:{ fileSize:10 * 1024 * 1024, files:1 } });
  const error = (res, e) => {
    if (!e.status) console.error('certificados:', e);
    res.status(e.status || 500).json({ error:e.status ? e.message : 'No se pudo procesar el certificado.' });
  };
  const cabecerasPublicas = res => {
    res.set('X-Content-Type-Options','nosniff');
    res.set('X-Robots-Tag','noindex, nofollow');
    res.set('Cache-Control','private, no-store');
  };
  router.get('/publico/:token', async (req,res) => {
    cabecerasPublicas(res);
    try { res.json(informacionPublicaCertificado(await servicio.publico(req.params.token))); }
    catch (e) { error(res,e); }
  });
  // Los QR de versiones anteriores también abren la ficha del sitio.
  router.get('/publico/:token/descargar', async (req, res) => {
    cabecerasPublicas(res);
    try {
      const certificado = await servicio.publico(req.params.token);
      const site = (process.env.SITE_URL || process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/,'');
      res.redirect(303,`${site}${certificado.verificacion_path}`);
    } catch (e) { error(res,e); }
  });
  router.use(verifyToken, requireRole('admin','presidente'));
  router.get('/:id/pdf', async (req,res) => {
    try {
      const certificado = await servicio.original(req.params.id);
      res.set('X-Content-Type-Options','nosniff'); res.set('Cache-Control','private, no-store');
      res.download(certificado.archivo, `${certificado.codigo}.pdf`, e => {
        if (e && !res.headersSent) res.status(404).json({ error:'Archivo no disponible. Contacta a la institución.' });
      });
    } catch (e) { error(res,e); }
  });
  router.get('/', async (_req,res) => {
    try { res.json({ data:await servicio.listar() }); } catch (e) { error(res,e); }
  });
  router.post('/', async (req,res) => {
    try { res.status(201).json(await servicio.reservar(req.body.datos,req.body.clave_solicitud,req.user.id)); }
    catch (e) { error(res,e); }
  });
  router.put('/:id/pdf', (req,res,next) => upload.single('archivo')(req,res,e => {
    if (e) return res.status(400).json({ error:e.code === 'LIMIT_FILE_SIZE' ? 'El PDF supera 10 MB.' : 'Archivo inválido.' });
    next();
  }), async (req,res) => {
    try { res.json(await servicio.guardarPDF(req.params.id,req.file?.buffer,req.user.id,req.user.role === 'admin')); }
    catch (e) { error(res,e); }
  });
  return router;
}

export default crearRouterCertificados();
