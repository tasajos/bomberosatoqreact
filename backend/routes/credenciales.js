import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import pool from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { crearServicioCredenciales } from '../services/credenciales.js';

export function crearRouterCredenciales(servicio=crearServicioCredenciales({pool,storageDir:fileURLToPath(new URL('../storage/credenciales/',import.meta.url))}),db=pool) {
  const router=Router(),upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
  const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
  router.use((_req,res,next)=>{res.set('Cache-Control','private, no-store');res.set('X-Robots-Tag','noindex, nofollow');res.set('X-Content-Type-Options','nosniff');next();});
  router.get('/publico/:token',wrap(async(req,res)=>res.json(await servicio.publico(req.params.token))));
  router.use(verifyToken);
  router.use(async(req,_res,next)=>{try{const [[u]]=await db.query('SELECT role,activo FROM users WHERE id=?',[req.user.id]);
    if(!u?.activo)throw Object.assign(new Error('Usuario inactivo.'),{status:403});req.user.role=u.role;next();}catch(e){next(e);}});
  router.use(requireRole('presidente','admin'));
  router.get('/voluntarios',wrap(async(_req,res)=>res.json({data:await servicio.voluntarios()})));
  router.get('/',wrap(async(_req,res)=>res.json({data:await servicio.listar()})));
  router.post('/',wrap(async(req,res)=>res.status(201).json(await servicio.reservar(req.body.datos,req.body.clave_solicitud,req.user.id))));
  router.put('/:id/pdf',(req,res,next)=>upload.single('archivo')(req,res,e=>e?res.status(400).json({error:'Adjunte un PDF de hasta 5 MB.'}):next()),
    wrap(async(req,res)=>res.json(await servicio.guardarPDF(req.params.id,req.file?.buffer,req.body.diseno_version||1))));
  router.post('/:id/anular',wrap(async(req,res)=>res.json(await servicio.anular(req.params.id,req.body.motivo,req.user.id))));
  router.get('/:id/pdf',wrap(async(req,res)=>{const r=await servicio.original(req.params.id);res.download(r.archivo,r.nombre,e=>{if(e&&!res.headersSent)res.status(404).json({error:'Archivo no disponible.'});});}));
  // Ante un error interno se devuelve solo su código técnico (p. ej. ER_BAD_FIELD_ERROR) para diagnosticar sin exponer detalles.
  router.use((e,_req,res,_next)=>{if(!e.status)console.error('Credenciales:',e.code||'',e.sqlMessage||e.message);
    res.status(e.status||500).json(e.status?{error:e.message}:{error:'No se pudo procesar la credencial.',codigo:String(e.code||e.errno||'ERROR')});});
  return router;
}
export default crearRouterCredenciales();
