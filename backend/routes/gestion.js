import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { crearGestion, exigir, texto, monto, fecha, hoyBolivia, ESTADOS_EQUIPO, CONCEPTOS, CONCEPTOS_MOVIMIENTO } from '../services/gestion.js';
import { registrarPersonal } from './gestionPersonal.js';
import { crearMensualidades, esPeriodo, periodo, nombrePeriodo, SQL_COBRABLE } from '../services/mensualidades.js';

const NOMBRE = t => `TRIM(CONCAT_WS(' ',${t}.nombre,${t}.apellido_paterno,${t}.apellido_materno))`;
const nombreConcepto = clave => CONCEPTOS_MOVIMIENTO.find(c => c.clave === clave)?.nombre ?? clave ?? 'Sin concepto';
// El saldo de una deuda es su monto menos los egresos vinculados: nunca se almacena.
const DEUDAS = `SELECT d.*, u.nombre creado_nombre, mi.comprobante ingreso_comprobante,
  COALESCE((SELECT SUM(p.monto) FROM fin_movimientos p WHERE p.deuda_id=d.id AND p.tipo='egreso'),0) pagado
  FROM fin_deudas d JOIN users u ON u.id=d.creado_por LEFT JOIN fin_movimientos mi ON mi.id=d.movimiento_ingreso_id`;
function conSaldo(d) {
  const pagado = Number(d.pagado), saldo = Math.round((Number(d.monto) - pagado) * 100) / 100;
  return { ...d, pagado, saldo, estado: saldo <= 0 ? 'pagada' : 'pendiente' };
}

export function crearRouterGestion(pool, servicio = crearGestion(pool)) {
  const router = Router();
  const fin = requireRole('jefe_finanzas');
  const log = requireRole('jefe_logistica');
  const logPres = requireRole('jefe_logistica','presidente');
  const pres = requireRole('presidente');
  const finPres = requireRole('jefe_finanzas','presidente');
  const mens = crearMensualidades(pool);
  router.use(verifyToken);
  // Consultar el rol vigente evita que un JWT antiguo conserve privilegios revocados.
  router.use(async (req,res,next) => {
    try {
      const [[u]] = await pool.query('SELECT id,nombre,email,role,activo FROM users WHERE id=?', [req.user.id]);
      exigir(u?.activo, 'Usuario inactivo', 403); req.user = u;
      await servicio.init(); next();
    } catch(e) { next(e); }
  });
  const get = fn => async (req,res,next) => { try { res.json(await fn(req)); } catch(e) { next(e); } };
  const post = fn => get(req => servicio.transaccion(req.user, req.get('Idempotency-Key'), {path:req.path,body:req.body}, db => fn(req,db)));
  const audit = (db, req, entidad, id, accion, detalle=req.body) => servicio.evento(db,entidad,id,accion,req.user,detalle);
  async function solicitud(db, id) {
    const [[s]] = await db.query('SELECT * FROM fin_solicitudes WHERE id=?', [id]);
    exigir(s, 'Solicitud no encontrada', 404); return s;
  }
  async function avisarSolicitud(db, s, accion) {
    await servicio.notificar(db,`solicitud:${s.id}:${accion}`,'jefe_finanzas',s.solicitante_id,
      `Solicitud #${s.id} · ${accion}`, `Solicitud #${s.id}\nTipo: ${s.tipo}\nConcepto: ${s.concepto==='otro'?`Otro: ${s.concepto_otro}`:s.concepto}\nMonto: Bs ${s.monto}\nDetalle: ${s.detalle}\nEstado: ${accion}${s.rechazo_motivo ? `\nMotivo: ${s.rechazo_motivo}` : ''}\nConsulte el portal institucional para ver las autorizaciones y el voucher cuando se ejecute el egreso.`);
  }
  router.get('/finanzas', requireRole('jefe_finanzas','presidente'), get(async () => {
    const resumen = await servicio.saldo(pool);
    const [movimientos] = await pool.query(`SELECT m.*, u.nombre registrado_nombre, ${NOMBRE('b')} beneficiario, dd.acreedor deuda_acreedor
      FROM fin_movimientos m JOIN users u ON u.id=m.registrado_por LEFT JOIN fin_solicitudes s ON s.id=m.solicitud_id
      LEFT JOIN users b ON b.id=COALESCE(s.solicitante_id,m.voluntario_id) LEFT JOIN fin_deudas dd ON dd.id=m.deuda_id ORDER BY m.id DESC`);
    const [reservas] = await pool.query(`SELECT r.*, d.nombre destino_nombre, c.nombre campania_nombre, u.nombre creado_nombre FROM fin_reservas r
      JOIN fin_destinos d ON d.clave=r.destino LEFT JOIN campanias c ON c.id=r.campania_id JOIN users u ON u.id=r.creado_por ORDER BY r.id DESC`);
    return { resumen, movimientos, reservas, conceptos: CONCEPTOS_MOVIMIENTO };
  }));
  router.post('/movimientos', fin, post(async (req,db) => {
    const {tipo} = req.body;
    exigir(['ingreso','egreso'].includes(tipo), 'Tipo inválido');
    const cantidad = monto(req.body.monto), detalle = texto(req.body.detalle,'Detalle',2000);
    const referencia = req.body.referencia ? texto(req.body.referencia,'Referencia',200) : '';
    let concepto = req.body.concepto || `otros_${tipo}s`, deuda = null;
    if (req.body.deuda_id) {
      exigir(tipo === 'egreso', 'Solo un egreso puede cubrir una deuda');
      const [[d]] = await db.query(`${DEUDAS} WHERE d.id=?`, [Number(req.body.deuda_id) || 0]);
      exigir(d, 'Deuda no encontrada', 404);
      deuda = conSaldo(d);
      exigir(deuda.saldo > 0, 'La deuda ya está pagada', 409);
      exigir(Math.round(Number(cantidad)*100) <= Math.round(deuda.saldo*100), `El pago excede el saldo pendiente de la deuda (Bs ${deuda.saldo.toFixed(2)})`, 409);
      concepto = 'pago_deuda';
    } else exigir(CONCEPTOS_MOVIMIENTO.some(c => c.manual && c.clave === concepto && c.tipo === tipo), 'Seleccione un concepto válido');
    if (tipo === 'egreso') await servicio.disponible(db,cantidad);
    const codigo = await servicio.comprobante(db);
    const [r] = await db.query('INSERT INTO fin_movimientos (comprobante,tipo,concepto,monto,detalle,referencia,deuda_id,registrado_por) VALUES (?,?,?,?,?,?,?,?)', [codigo,tipo,concepto,cantidad,detalle,referencia,deuda?.id ?? null,req.user.id]);
    const saldo_deuda = deuda ? Math.round((deuda.saldo - Number(cantidad))*100)/100 : undefined;
    await audit(db,req,'movimiento',r.insertId,'registrado',{...req.body,concepto,comprobante:codigo,saldo_deuda}); return {id:r.insertId,comprobante:codigo,saldo_deuda};
  }));
  router.post('/reservas', fin, post(async (req,db) => {
    const {campania_id} = req.body;
    const [[destino]] = await db.query('SELECT * FROM fin_destinos WHERE clave=? AND activo=1',[req.body.destino || null]);
    exigir(destino,'Seleccione un destino activo');
    const cantidad=monto(req.body.monto), detalle=texto(req.body.detalle,'Detalle');
    if (destino.requiere_campania) {
      const [[c]] = await db.query('SELECT id FROM campanias WHERE id=?',[campania_id || null]);
      exigir(c,'Seleccione una campaña existente');
    }
    await servicio.disponible(db,cantidad);
    const codigo = await servicio.comprobante(db);
    const [r] = await db.query('INSERT INTO fin_reservas (comprobante,destino,campania_id,detalle,monto,creado_por) VALUES (?,?,?,?,?,?)',[codigo,destino.clave,destino.requiere_campania?campania_id:null,detalle,cantidad,req.user.id]);
    await audit(db,req,'reserva',r.insertId,'creada',{...req.body,comprobante:codigo}); return {id:r.insertId,comprobante:codigo};
  }));
  router.get('/destinos', finPres, get(async () => {
    const [rows] = await pool.query('SELECT d.*, (SELECT COUNT(*) FROM fin_reservas r WHERE r.destino=d.clave) reservas FROM fin_destinos d ORDER BY d.activo DESC, d.nombre');
    return rows;
  }));
  router.post('/destinos', fin, post(async (req,db) => {
    const nombre = texto(req.body.nombre,'Nombre del destino',120);
    const base = nombre.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50) || 'destino';
    let clave = base;
    for (let i=2; (await db.query('SELECT 1 FROM fin_destinos WHERE clave=?',[clave]))[0].length; i++) clave = `${base}-${i}`;
    const campania = [true,'1','true','si'].includes(req.body.requiere_campania);
    await db.query('INSERT INTO fin_destinos (clave,nombre,requiere_campania,creado_por) VALUES (?,?,?,?)',[clave,nombre,campania?1:0,req.user.id]);
    await audit(db,req,'destino',0,'creado',{clave,nombre,requiere_campania:campania}); return {clave};
  }));
  router.post('/destinos/:clave/estado', fin, post(async (req,db) => {
    exigir(typeof req.body.activo==='boolean','Estado inválido');
    const [r] = await db.query('UPDATE fin_destinos SET activo=? WHERE clave=?',[req.body.activo?1:0,req.params.clave]);
    exigir(r.affectedRows,'Destino no encontrado',404);
    await audit(db,req,'destino',0,req.body.activo?'activado':'desactivado',{clave:req.params.clave}); return {ok:true};
  }));
  router.post('/reservas/:id/liberar', fin, post(async (req,db) => {
    const motivo=texto(req.body.motivo,'Motivo de liberación');
    const [r] = await db.query("UPDATE fin_reservas SET estado='liberada',liberada_at=NOW(),liberada_por=?,liberada_motivo=? WHERE id=? AND estado='activa'",[req.user.id,motivo,req.params.id]);
    exigir(r.affectedRows,'La reserva ya no está activa',409);
    await audit(db,req,'reserva',Number(req.params.id),'liberada',{motivo}); return {ok:true};
  }));
  router.get('/solicitudes',requireRole('voluntario','jefe_finanzas','presidente'),get(async req => {
    const propio=req.user.role==='voluntario';
    const [rows]=await pool.query(`SELECT s.*, u.nombre solicitante_nombre, f.nombre finanzas_nombre,
      p.nombre presidencia_nombre, m.id movimiento_id, m.comprobante,
      (SELECT COUNT(*) FROM gestion_correos c WHERE c.evento LIKE CONCAT('solicitud:',s.id,':%') AND c.enviado_at IS NULL) correos_pendientes
      FROM fin_solicitudes s JOIN users u ON u.id=s.solicitante_id
      LEFT JOIN users f ON f.id=s.finanzas_por LEFT JOIN users p ON p.id=s.presidencia_por
      LEFT JOIN fin_movimientos m ON m.solicitud_id=s.id
      ${propio?'WHERE s.solicitante_id=?':''} ORDER BY s.id DESC`,propio?[req.user.id]:[]);
    return rows;
  }));
  router.post('/solicitudes',requireRole('voluntario','jefe_finanzas'),post(async(req,db)=>{
    const tipo=req.user.role==='voluntario'?'egreso':req.body.tipo;
    exigir(['ingreso','egreso'].includes(tipo),'Tipo inválido');
    exigir(CONCEPTOS.includes(req.body.concepto),'Concepto inválido');
    if(req.user.role==='jefe_finanzas') exigir(req.body.concepto==='apoyo','Las solicitudes de finanzas son por apoyos');
    const cantidad=monto(req.body.monto), detalle=texto(req.body.detalle,'Detalle',2000);
    const otro=req.body.concepto==='otro'?texto(req.body.concepto_otro,'Especifique el concepto',80):null;
    // Finanzas también deja su aprobación explícita en un paso separado.
    const [r]=await db.query('INSERT INTO fin_solicitudes (solicitante_id,tipo,concepto,concepto_otro,detalle,monto) VALUES (?,?,?,?,?,?)',[req.user.id,tipo,req.body.concepto,otro,detalle,cantidad]);
    const s=await solicitud(db,r.insertId);
    await avisarSolicitud(db,s,'registrada'); await audit(db,req,'solicitud',s.id,'registrada'); return {id:s.id};
  }));
  router.post('/solicitudes/:id/finanzas',fin,post(async(req,db)=>{
    const s=await solicitud(db,req.params.id);
    exigir(s.estado==='pendiente_finanzas','La solicitud ya fue atendida por finanzas',409);
    exigir(['aprobar','rechazar'].includes(req.body.accion),'Acción inválida');
    const aprobar=req.body.accion==='aprobar';
    const motivo=aprobar?null:texto(req.body.motivo,'Motivo del rechazo');
    if(aprobar && s.tipo==='egreso') await servicio.disponible(db,s.monto);
    await db.query('UPDATE fin_solicitudes SET estado=?,finanzas_por=?,finanzas_fecha=NOW(),rechazo_motivo=? WHERE id=?',[aprobar?'pendiente_presidencia':'rechazada',req.user.id,motivo,s.id]);
    await avisarSolicitud(db,{...s,rechazo_motivo:motivo},aprobar?'aprobada por finanzas':'rechazada por finanzas');
    await audit(db,req,'solicitud',s.id,aprobar?'finanzas_aprobo':'finanzas_rechazo'); return {ok:true};
  }));
  router.post('/solicitudes/:id/presidencia',pres,post(async(req,db)=>{
    const s=await solicitud(db,req.params.id);
    exigir(s.estado==='pendiente_presidencia','Se requiere aprobación previa de finanzas',409);
    exigir(s.finanzas_por!==req.user.id,'Las aprobaciones deben ser de dos personas distintas',409);
    exigir(['aprobar','rechazar'].includes(req.body.accion),'Acción inválida');
    const aprobar=req.body.accion==='aprobar';
    const motivo=aprobar?null:texto(req.body.motivo,'Motivo del rechazo');
    await db.query('UPDATE fin_solicitudes SET estado=?,presidencia_por=?,presidencia_fecha=NOW(),rechazo_motivo=? WHERE id=?',[aprobar?'autorizada':'rechazada',req.user.id,motivo,s.id]);
    await avisarSolicitud(db,{...s,rechazo_motivo:motivo},aprobar?'autorizada por presidencia':'rechazada por presidencia');
    await audit(db,req,'solicitud',s.id,aprobar?'presidencia_aprobo':'presidencia_rechazo'); return {ok:true};
  }));
  router.post('/solicitudes/:id/ejecutar',fin,post(async(req,db)=>{
    const s=await solicitud(db,req.params.id);
    exigir(s.estado==='autorizada' && s.finanzas_por && s.presidencia_por,'Se requieren ambas autorizaciones y una solicitud sin ejecutar',409);
    const referencia=texto(req.body.referencia,'Referencia de pago o recepción',200);
    // El egreso ya está comprometido desde la aprobación financiera.
    const codigo=await servicio.comprobante(db);
    const [r]=await db.query('INSERT INTO fin_movimientos (comprobante,tipo,concepto,monto,detalle,referencia,solicitud_id,registrado_por) VALUES (?,?,?,?,?,?,?,?)',[codigo,s.tipo,s.concepto,s.monto,s.detalle,referencia,s.id,req.user.id]);
    await db.query("UPDATE fin_solicitudes SET estado='ejecutada' WHERE id=?",[s.id]);
    await avisarSolicitud(db,s,`ejecutada · voucher ${codigo}`);
    await audit(db,req,'solicitud',s.id,'ejecutada',{movimiento_id:r.insertId,comprobante:codigo,referencia}); return {id:r.insertId,comprobante:codigo};
  }));
  // Un mismo correlativo FIN identifica movimientos (ingreso/egreso) y reservas.
  router.get('/vouchers/:codigo',requireRole('voluntario','jefe_finanzas','presidente'),get(async req=>{
    const codigo=String(req.params.codigo).toUpperCase();
    exigir(/^FIN\d{3,}$/.test(codigo),'Voucher no encontrado',404);
    const [[m]]=await pool.query(`SELECT m.comprobante codigo,m.tipo clase,m.monto,m.detalle,m.referencia,m.created_at fecha,
      r.nombre registrado_nombre,s.id solicitud_id,u.id persona_id,m.voluntario_id mensualidad,COALESCE(s.concepto,m.concepto) concepto,s.created_at solicitud_fecha,
      m.deuda_id,dd.acreedor deuda_acreedor,dd.tipo deuda_tipo,dd.monto deuda_monto,s.concepto_otro,
      (SELECT COALESCE(SUM(x.monto),0) FROM fin_movimientos x WHERE x.deuda_id=m.deuda_id AND x.tipo='egreso' AND x.id<m.id) deuda_pagado_antes,
      ${NOMBRE('u')} beneficiario,u.carnet_identidad beneficiario_ci,u.grado beneficiario_grado,u.email beneficiario_email,
      ${NOMBRE('f')} finanzas_nombre,s.finanzas_fecha,${NOMBRE('p')} presidencia_nombre,s.presidencia_fecha
      FROM fin_movimientos m JOIN users r ON r.id=m.registrado_por LEFT JOIN fin_solicitudes s ON s.id=m.solicitud_id
      LEFT JOIN users u ON u.id=COALESCE(s.solicitante_id,m.voluntario_id) LEFT JOIN users f ON f.id=s.finanzas_por
      LEFT JOIN users p ON p.id=s.presidencia_por LEFT JOIN fin_deudas dd ON dd.id=m.deuda_id WHERE m.comprobante=?`,[codigo]);
    if(m){
      exigir(req.user.role!=='voluntario'||m.persona_id===req.user.id,'Voucher no encontrado',404);
      const {persona_id,mensualidad,...datos}=m,v={...datos,concepto_nombre:m.concepto_otro?`Otro: ${m.concepto_otro}`:nombreConcepto(m.concepto)};
      if(!mensualidad) return v;
      const [periodos]=await pool.query('SELECT p.periodo,p.monto FROM fin_mensualidad_pagos p JOIN fin_movimientos m ON m.id=p.movimiento_id WHERE m.comprobante=? ORDER BY p.periodo',[codigo]);
      return {...v,periodos};
    }
    exigir(req.user.role!=='voluntario','Voucher no encontrado',404);
    const [[r]]=await pool.query(`SELECT r.comprobante codigo,'reserva' clase,r.monto,r.detalle,r.created_at fecha,r.destino,d.nombre destino_nombre,r.estado,
      c.nombre campania_nombre,u.nombre registrado_nombre,r.liberada_at,r.liberada_motivo,l.nombre liberada_nombre
      FROM fin_reservas r JOIN fin_destinos d ON d.clave=r.destino JOIN users u ON u.id=r.creado_por LEFT JOIN campanias c ON c.id=r.campania_id
      LEFT JOIN users l ON l.id=r.liberada_por WHERE r.comprobante=?`,[codigo]);
    exigir(r,'Voucher no encontrado',404); return r;
  }));
  // Deudas y préstamos de la institución: se pagan con egresos vinculados (POST /movimientos con deuda_id).
  async function listarDeudas(db){
    const [deudas]=await db.query(`${DEUDAS} ORDER BY d.fecha DESC, d.id DESC`);
    const [pagos]=await db.query(`SELECT m.id,m.deuda_id,m.comprobante,m.monto,m.referencia,m.created_at,u.nombre registrado_nombre
      FROM fin_movimientos m JOIN users u ON u.id=m.registrado_por WHERE m.deuda_id IS NOT NULL AND m.tipo='egreso' ORDER BY m.id`);
    return deudas.map(d=>({...conSaldo(d),pagos:pagos.filter(p=>p.deuda_id===d.id)}));
  }
  router.get('/deudas',finPres,get(()=>listarDeudas(pool)));
  router.post('/deudas',fin,post(async(req,db)=>{
    const {tipo}=req.body;
    exigir(['prestamo','proveedor','otro'].includes(tipo),'Tipo de deuda inválido');
    const acreedor=texto(req.body.acreedor,'Acreedor',200),detalle=texto(req.body.detalle,'Detalle'),cantidad=monto(req.body.monto);
    const desde=fecha(req.body.fecha),vence=req.body.vencimiento?fecha(req.body.vencimiento):null;
    exigir(!vence||vence>=desde,'El vencimiento no puede ser anterior a la fecha de la deuda');
    const [r]=await db.query('INSERT INTO fin_deudas (tipo,acreedor,detalle,monto,fecha,vencimiento,creado_por) VALUES (?,?,?,?,?,?,?)',[tipo,acreedor,detalle,cantidad,desde,vence,req.user.id]);
    // Un préstamo recibido en efectivo o transferencia ingresa a caja con su propio voucher.
    let codigo;
    if(tipo==='prestamo'&&[true,'1','true','si'].includes(req.body.ingresa_caja)){
      codigo=await servicio.comprobante(db);
      const [m]=await db.query('INSERT INTO fin_movimientos (comprobante,tipo,concepto,monto,detalle,referencia,registrado_por) VALUES (?,?,?,?,?,?,?)',[codigo,'ingreso','prestamo',cantidad,`Préstamo recibido de ${acreedor} · ${detalle}`.slice(0,2000),`Deuda #${r.insertId}`,req.user.id]);
      await db.query('UPDATE fin_deudas SET movimiento_ingreso_id=? WHERE id=?',[m.insertId,r.insertId]);
    }
    await audit(db,req,'deuda',r.insertId,'registrada',{...req.body,comprobante:codigo}); return {id:r.insertId,comprobante:codigo};
  }));
  // Datos completos para el reporte Excel; el rango filtra movimientos y pagos por fecha de registro.
  router.get('/reportes/finanzas',finPres,get(async req=>{
    const desde=req.query.desde?fecha(String(req.query.desde)):null,hasta=req.query.hasta?fecha(String(req.query.hasta)):null;
    exigir(!desde||!hasta||desde<=hasta,'La fecha inicial debe ser anterior a la final');
    const cond=[],params=[];
    if(desde){cond.push('m.created_at>=?');params.push(`${desde} 00:00:00`);}
    if(hasta){cond.push('m.created_at<=?');params.push(`${hasta} 23:59:59`);}
    const where=cond.length?`WHERE ${cond.join(' AND ')}`:'';
    const [movimientos]=await pool.query(`SELECT m.id,m.comprobante,m.tipo,m.concepto,s.concepto_otro,m.monto,m.detalle,m.referencia,m.created_at,m.solicitud_id,
      u.nombre registrado_nombre,${NOMBRE('b')} beneficiario,dd.acreedor deuda_acreedor FROM fin_movimientos m JOIN users u ON u.id=m.registrado_por
      LEFT JOIN fin_solicitudes s ON s.id=m.solicitud_id LEFT JOIN users b ON b.id=COALESCE(s.solicitante_id,m.voluntario_id)
      LEFT JOIN fin_deudas dd ON dd.id=m.deuda_id ${where} ORDER BY m.created_at,m.id`,params);
    const [pagosMensualidad]=await pool.query(`SELECT p.periodo,p.monto,m.comprobante,m.created_at,${NOMBRE('u')} voluntario,u.carnet_identidad ci
      FROM fin_mensualidad_pagos p JOIN fin_movimientos m ON m.id=p.movimiento_id JOIN users u ON u.id=p.voluntario_id ${where} ORDER BY m.created_at,p.periodo`,params);
    const voluntarios=(await mens.estados(pool)).map(({meses,por_cobrar,...e})=>e);
    return {generado:new Date().toISOString(),hoy:hoyBolivia(),desde,hasta,resumen:await servicio.saldo(pool),conceptos:CONCEPTOS_MOVIMIENTO,
      movimientos:movimientos.map(m=>({...m,concepto_nombre:m.concepto_otro?`Otro: ${m.concepto_otro}`:nombreConcepto(m.concepto)})),deudas:await listarDeudas(pool),
      mensualidades:{pagos:pagosMensualidad,voluntarios}};
  }));
  // Mensualidades: la deuda se calcula a partir de tarifas, inicio, exenciones y pagos registrados.
  router.get('/mensualidades',finPres,get(async()=>{
    const [tarifas]=await pool.query('SELECT t.*,u.nombre creado_nombre FROM fin_mensualidad_tarifas t JOIN users u ON u.id=t.creado_por ORDER BY t.desde DESC');
    const voluntarios=(await mens.estados(pool)).map(({meses,por_cobrar,...e})=>e);
    return {hoy:hoyBolivia(),tarifas,voluntarios};
  }));
  router.get('/mensualidades/voluntarios/:id',finPres,get(req=>mens.estado(pool,req.params.id)));
  router.get('/mi-mensualidad',requireRole('voluntario'),get(req=>mens.estado(pool,req.user.id)));
  router.post('/mensualidades/tarifas',fin,post(async(req,db)=>{
    const desde=periodo(req.body.desde,'Mes de vigencia');
    exigir(/^\d{1,10}(\.\d{1,2})?$/.test(String(req.body.monto??'')),'Monto inválido: use 0 para suspender el cobro');
    const cantidad=Number(req.body.monto).toFixed(2),dia=Number(req.body.dia_vencimiento);
    exigir(Number.isInteger(dia)&&dia>=1&&dia<=28,'El día de vencimiento debe estar entre 1 y 28');
    // Una tarifa retroactiva solo se acepta si aún no hay pagos afectados.
    if(desde<hoyBolivia().slice(0,7)){
      const [[pagado]]=await db.query('SELECT periodo FROM fin_mensualidad_pagos WHERE periodo>=? LIMIT 1',[desde]);
      exigir(!pagado,`Ya existen pagos desde ${nombrePeriodo(pagado?.periodo??desde)}: la nueva tarifa debe regir desde el mes actual o posterior`,409);
    }
    await db.query('INSERT INTO fin_mensualidad_tarifas (desde,monto,dia_vencimiento,creado_por) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE monto=VALUES(monto),dia_vencimiento=VALUES(dia_vencimiento),creado_por=VALUES(creado_por)',[desde,cantidad,dia,req.user.id]);
    await audit(db,req,'tarifa',0,'configurada',{desde,monto:cantidad,dia_vencimiento:dia}); return {ok:true};
  }));
  async function voluntarioCobro(db,id){
    const [[v]]=await db.query(`SELECT u.id,(${SQL_COBRABLE}) cobrable FROM users u WHERE u.id=? AND u.role='voluntario'`,[Number(id)||0]);
    exigir(v,'Voluntario no encontrado',404);
    exigir(v.cobrable,'Solo se registran mensualidades de voluntarios activos o pasivos (no de baja, cooperadores ni en comisión)',409);
    return v;
  }
  router.post('/mensualidades/voluntarios/:id/inicio',fin,post(async(req,db)=>{
    const v=await voluntarioCobro(db,req.params.id),inicio=periodo(req.body.inicio,'Mes de inicio');
    const [[p]]=await db.query('SELECT MIN(periodo) primero FROM fin_mensualidad_pagos WHERE voluntario_id=?',[v.id]);
    exigir(!p.primero||inicio<=p.primero,`El inicio no puede ser posterior al primer mes pagado (${nombrePeriodo(p.primero??inicio)})`,409);
    await db.query('INSERT INTO fin_mensualidad_voluntarios (voluntario_id,inicio,actualizado_por) VALUES (?,?,?) ON DUPLICATE KEY UPDATE inicio=VALUES(inicio),actualizado_por=VALUES(actualizado_por)',[v.id,inicio,req.user.id]);
    await audit(db,req,'mensualidad_voluntario',v.id,'inicio',{inicio}); return {ok:true};
  }));
  router.post('/mensualidades/voluntarios/:id/exenciones',fin,post(async(req,db)=>{
    const v=await voluntarioCobro(db,req.params.id),desde=periodo(req.body.desde,'Mes inicial');
    const hasta=req.body.hasta?periodo(req.body.hasta,'Mes final'):null,motivo=texto(req.body.motivo,'Motivo de la exención',500);
    exigir(!hasta||hasta>=desde,'El mes final debe ser igual o posterior al inicial');
    const [r]=await db.query('INSERT INTO fin_mensualidad_exenciones (voluntario_id,desde,hasta,motivo,creado_por) VALUES (?,?,?,?,?)',[v.id,desde,hasta,motivo,req.user.id]);
    await audit(db,req,'mensualidad_voluntario',v.id,'exencion',{id:r.insertId,desde,hasta,motivo}); return {id:r.insertId};
  }));
  router.post('/mensualidades/exenciones/:id/cerrar',fin,post(async(req,db)=>{
    const hasta=periodo(req.body.hasta,'Último mes exento');
    const [[e]]=await db.query('SELECT * FROM fin_mensualidad_exenciones WHERE id=?',[req.params.id]);
    exigir(e,'Exención no encontrada',404);exigir(!e.hasta,'La exención ya tiene un mes final',409);exigir(hasta>=e.desde,'El mes final debe ser igual o posterior al inicial');
    await db.query('UPDATE fin_mensualidad_exenciones SET hasta=? WHERE id=?',[hasta,e.id]);
    await audit(db,req,'mensualidad_voluntario',e.voluntario_id,'exencion_cerrada',{id:e.id,hasta}); return {ok:true};
  }));
  router.post('/mensualidades/cobros',fin,post(async(req,db)=>{
    const {periodos}=req.body;
    exigir(Array.isArray(periodos)&&periodos.length>=1&&periodos.length<=24&&periodos.every(esPeriodo),'Seleccione entre 1 y 24 meses a cobrar');
    const e=await mens.estado(db,(await voluntarioCobro(db,req.body.voluntario_id)).id);
    // El cobro respeta el orden: primero los meses más antiguos pendientes.
    const esperados=e.por_cobrar.slice(0,periodos.length);
    exigir(esperados.length===periodos.length&&esperados.every((m,i)=>m.periodo===periodos[i]),'Cobre primero los meses pendientes más antiguos (la información pudo cambiar: actualice la pantalla)',409);
    const total=(Math.round(esperados.reduce((s,m)=>s+m.monto,0)*100)/100).toFixed(2);
    const referencia=req.body.referencia?texto(req.body.referencia,'Referencia',200):'';
    const meses=esperados.map(m=>nombrePeriodo(m.periodo));
    const detalle=`Mensualidad${meses.length>1?'es':''} ${meses.length>2?`${meses[0]} a ${meses.at(-1)} (${meses.length} meses)`:meses.join(' y ')} · ${e.voluntario.nombre}`;
    const codigo=await servicio.comprobante(db);
    const [r]=await db.query('INSERT INTO fin_movimientos (comprobante,tipo,concepto,monto,detalle,referencia,voluntario_id,registrado_por) VALUES (?,?,?,?,?,?,?,?)',[codigo,'ingreso','mensualidad',total,detalle,referencia,e.voluntario.id,req.user.id]);
    for(const m of esperados) await db.query('INSERT INTO fin_mensualidad_pagos (voluntario_id,periodo,monto,movimiento_id) VALUES (?,?,?,?)',[e.voluntario.id,m.periodo,m.monto.toFixed(2),r.insertId]);
    await servicio.notificar(db,`mensualidad:${r.insertId}:pagada`,'jefe_finanzas',e.voluntario.id,`Pago de mensualidades · voucher ${codigo}`,
      `Voluntario: ${e.voluntario.nombre}\nMeses pagados: ${meses.join(', ')}\nTotal: Bs ${total}\nVoucher: ${codigo}\nConsulte el estado de sus mensualidades y descargue el voucher en el portal institucional.`);
    await audit(db,req,'mensualidad_voluntario',e.voluntario.id,'cobro',{movimiento_id:r.insertId,comprobante:codigo,periodos,total,referencia});
    return {id:r.insertId,comprobante:codigo};
  }));
  router.get('/voluntarios',requireRole('jefe_logistica','presidente'),get(async()=>{
    const [rows]=await pool.query("SELECT id,nombre,apellido_paterno FROM users WHERE activo=1 AND role='voluntario' ORDER BY nombre");return rows;
  }));
  // Equipo con su préstamo vigente (pendiente o autorizado) y, si fue dado de baja, su acta.
  const EQUIPOS=`SELECT e.*, p.id prestamo_activo, p.estado prestamo_estado, p.fecha_devolucion, ${NOMBRE('v')} asignado_a,
    (SELECT a.codigo FROM log_actas a WHERE a.equipo_id=e.id AND a.tipo='baja' ORDER BY a.id DESC LIMIT 1) acta_baja
    FROM log_equipos e LEFT JOIN log_prestamos p ON p.equipo_id=e.id AND p.estado IN ('pendiente','autorizado')
    LEFT JOIN users v ON v.id=p.voluntario_id`;
  router.get('/logistica',logPres,get(async()=>{
    const [equipos]=await pool.query(`${EQUIPOS} ORDER BY e.id DESC`);
    const [resumen]=await pool.query(`SELECT e.tipo,COUNT(*) total,
      SUM(e.estado='bueno') buenos,SUM(e.estado='regular') regulares,SUM(e.estado='mantenimiento') mantenimiento,
      SUM(e.estado='danado') danados,SUM(e.estado='baja') bajas,
      SUM(EXISTS(SELECT 1 FROM log_prestamos p WHERE p.equipo_id=e.id AND p.estado='autorizado')) prestados,
      SUM(e.estado IN ('bueno','regular') AND NOT EXISTS(SELECT 1 FROM log_prestamos p WHERE p.equipo_id=e.id AND p.estado IN ('pendiente','autorizado'))) disponibles
      FROM log_equipos e GROUP BY e.tipo ORDER BY e.tipo`);
    return {hoy:hoyBolivia(),equipos,resumen};
  }));
  // Catálogo de tipos de equipo: el nombre es la referencia del inventario (se renombra en cascada).
  router.get('/tipos-equipo',logPres,get(async()=>{
    const [rows]=await pool.query('SELECT t.*,(SELECT COUNT(*) FROM log_equipos e WHERE e.tipo=t.nombre) equipos FROM log_tipos t ORDER BY t.activo DESC,t.nombre');
    return rows;
  }));
  router.post('/tipos-equipo',log,post(async(req,db)=>{
    const nombre=texto(req.body.nombre,'Nombre del tipo',100);
    const [r]=await db.query('INSERT INTO log_tipos (nombre,creado_por) VALUES (?,?)',[nombre,req.user.id]);
    await audit(db,req,'tipo_equipo',r.insertId,'creado',{nombre}); return {id:r.insertId};
  }));
  router.post('/tipos-equipo/:id/estado',log,post(async(req,db)=>{
    exigir(typeof req.body.activo==='boolean','Estado inválido');
    const [r]=await db.query('UPDATE log_tipos SET activo=? WHERE id=?',[req.body.activo?1:0,req.params.id]);
    exigir(r.affectedRows,'Tipo no encontrado',404);
    await audit(db,req,'tipo_equipo',Number(req.params.id),req.body.activo?'activado':'desactivado'); return {ok:true};
  }));
  router.post('/equipos',log,post(async(req,db)=>{
    const codigo=texto(req.body.codigo,'Código',80),nombre=texto(req.body.nombre,'Nombre',200);
    const [[t]]=await db.query('SELECT nombre FROM log_tipos WHERE nombre=? AND activo=1',[req.body.tipo||null]);
    exigir(t,'Seleccione un tipo de equipo activo');
    const tipo=t.nombre;
    exigir(ESTADOS_EQUIPO.includes(req.body.estado)&&req.body.estado!=='baja','Seleccione el estado inicial del equipo');
    const observaciones=req.body.observaciones?texto(req.body.observaciones,'Observaciones',2000):'';
    const [r]=await db.query('INSERT INTO log_equipos (codigo,nombre,tipo,estado,observaciones,creado_por) VALUES (?,?,?,?,?,?)',[codigo,nombre,tipo,req.body.estado,observaciones,req.user.id]);
    await audit(db,req,'equipo',r.insertId,'registrado'); return {id:r.insertId};
  }));
  router.post('/equipos/:id/estado',log,post(async(req,db)=>{
    exigir(ESTADOS_EQUIPO.includes(req.body.estado),'Estado inválido');
    const motivo=texto(req.body.motivo,'Motivo del cambio',2000);
    const [[e]]=await db.query('SELECT * FROM log_equipos WHERE id=?',[req.params.id]);
    exigir(e,'Equipo no encontrado',404); exigir(e.estado!=='baja','El equipo ya fue dado de baja',409);
    const [[p]]=await db.query("SELECT id FROM log_prestamos WHERE equipo_id=? AND estado IN ('pendiente','autorizado')",[e.id]);
    exigir(!p,'Registre primero la devolución o el rechazo del préstamo pendiente',409);
    await db.query('UPDATE log_equipos SET estado=?,observaciones=? WHERE id=?',[req.body.estado,motivo,e.id]);
    const baja=req.body.estado==='baja';
    const codigo=baja?await servicio.acta(db,{tipo:'baja',equipo_id:e.id,estado_equipo:e.estado,motivo},req.user):undefined;
    await audit(db,req,'equipo',e.id,baja?'baja':'estado',{anterior:e.estado,nuevo:req.body.estado,motivo,acta:codigo}); return {ok:true,comprobante:codigo};
  }));
  router.get('/prestamos',requireRole('voluntario','jefe_logistica','presidente'),get(async req=>{
    const propio=req.user.role==='voluntario';
    const [rows]=await pool.query(`SELECT p.*,e.codigo,e.nombre equipo_nombre,e.tipo,e.estado equipo_estado,
      u.nombre voluntario_nombre,a.nombre autorizado_nombre,
      (SELECT x.codigo FROM log_actas x WHERE x.prestamo_id=p.id AND x.tipo='entrega') acta_entrega,
      (SELECT x.codigo FROM log_actas x WHERE x.prestamo_id=p.id AND x.tipo='devolucion') acta_devolucion,
      (SELECT COUNT(*) FROM gestion_correos c WHERE c.evento LIKE CONCAT('prestamo:',p.id,':%') AND c.enviado_at IS NULL) correos_pendientes
      FROM log_prestamos p JOIN log_equipos e ON e.id=p.equipo_id JOIN users u ON u.id=p.voluntario_id
      LEFT JOIN users a ON a.id=p.autorizado_por ${propio?'WHERE p.voluntario_id=?':''} ORDER BY p.id DESC`,propio?[req.user.id]:[]);
    return rows;
  }));
  async function prestamo(db,id){
    const [[p]]=await db.query('SELECT p.*,e.nombre equipo_nombre,e.estado equipo_estado FROM log_prestamos p JOIN log_equipos e ON e.id=p.equipo_id WHERE p.id=?',[id]);
    exigir(p,'Préstamo no encontrado',404);return p;
  }
  async function avisarPrestamo(db,p,accion){
    const vencimiento=p.fecha_devolucion instanceof Date?p.fecha_devolucion.toLocaleDateString('es-BO'):String(p.fecha_devolucion).slice(0,10);
    await servicio.notificar(db,`prestamo:${p.id}:${accion}`,'jefe_logistica',p.voluntario_id,`Préstamo #${p.id} · ${accion}`,`Equipo: ${p.equipo_nombre}\nDevolución: ${vencimiento}\nMotivo: ${p.motivo}\nEstado: ${accion}${p.rechazo_motivo ? `\nMotivo del rechazo: ${p.rechazo_motivo}` : ''}\nConsulte su file personal en el portal institucional.`);
  }
  router.post('/prestamos',log,post(async(req,db)=>{
    const devolucion=fecha(req.body.fecha_devolucion),motivo=texto(req.body.motivo,'Motivo');
    exigir(devolucion>=hoyBolivia(),'La devolución no puede estar en el pasado');
    const [[e]]=await db.query('SELECT * FROM log_equipos WHERE id=?',[req.body.equipo_id||null]);
    exigir(e&&['bueno','regular'].includes(e.estado),'El equipo no está disponible',409);
    const [[ocupado]]=await db.query("SELECT id FROM log_prestamos WHERE equipo_id=? AND estado IN ('pendiente','autorizado')",[e.id]);
    exigir(!ocupado,'El equipo ya está asignado o pendiente de autorización',409);
    const [[v]]=await db.query("SELECT id FROM users WHERE id=? AND activo=1 AND role='voluntario'",[req.body.voluntario_id||null]);
    exigir(v,'Seleccione un voluntario activo');
    const [r]=await db.query('INSERT INTO log_prestamos (equipo_id,voluntario_id,fecha_devolucion,motivo,solicitado_por,estado_salida) VALUES (?,?,?,?,?,?)',[e.id,v.id,devolucion,motivo,req.user.id,e.estado]);
    await avisarPrestamo(db,await prestamo(db,r.insertId),'pendiente de presidencia');
    await audit(db,req,'prestamo',r.insertId,'solicitado');return {id:r.insertId};
  }));
  router.post('/prestamos/:id/presidencia',pres,post(async(req,db)=>{
    const p=await prestamo(db,req.params.id);
    exigir(p.estado==='pendiente','Este préstamo ya fue atendido',409);
    exigir(['aprobar','rechazar'].includes(req.body.accion),'Acción inválida');
    const aprobar=req.body.accion==='aprobar';
    if(aprobar){
      const [[vigente]]=await db.query('SELECT id FROM log_prestamos WHERE id=? AND fecha_devolucion>=?',[p.id,hoyBolivia()]);
      exigir(vigente&&['bueno','regular'].includes(p.equipo_estado),'Fecha vencida o equipo no disponible',409);
      const [[activo]]=await db.query("SELECT id FROM users WHERE id=? AND activo=1 AND role='voluntario'",[p.voluntario_id]);
      exigir(activo,'El voluntario ya no está activo',409);
    }
    const motivo=aprobar?null:texto(req.body.motivo,'Motivo del rechazo');
    await db.query('UPDATE log_prestamos SET estado=?,autorizado_por=?,autorizado_at=NOW(),rechazo_motivo=? WHERE id=?',[aprobar?'autorizado':'rechazado',req.user.id,motivo,p.id]);
    // La autorización asigna el equipo: se emite el acta de entrega.
    const codigo=aprobar?await servicio.acta(db,{tipo:'entrega',prestamo_id:p.id,equipo_id:p.equipo_id,estado_equipo:p.estado_salida,motivo:p.motivo},req.user):undefined;
    await avisarPrestamo(db,{...p,rechazo_motivo:motivo},aprobar?`autorizado · acta ${codigo}`:'rechazado');
    await audit(db,req,'prestamo',p.id,aprobar?'autorizado':'rechazado',{...req.body,acta:codigo});return {ok:true,comprobante:codigo};
  }));
  router.post('/prestamos/:id/devolver',log,post(async(req,db)=>{
    const p=await prestamo(db,req.params.id);
    exigir(p.estado==='autorizado','El préstamo no está autorizado o ya fue devuelto',409);
    exigir(ESTADOS_EQUIPO.includes(req.body.estado)&&req.body.estado!=='baja','Estado de devolución inválido');
    const motivo=texto(req.body.motivo,'Observación de devolución');
    await db.query("UPDATE log_prestamos SET estado='devuelto',devuelto_por=?,devuelto_at=NOW(),estado_devolucion=?,observacion_devolucion=? WHERE id=?",[req.user.id,req.body.estado,motivo,p.id]);
    await db.query('UPDATE log_equipos SET estado=?,observaciones=? WHERE id=?',[req.body.estado,motivo,p.equipo_id]);
    const codigo=await servicio.acta(db,{tipo:'devolucion',prestamo_id:p.id,equipo_id:p.equipo_id,estado_equipo:req.body.estado,motivo},req.user);
    await avisarPrestamo(db,p,`devuelto · acta ${codigo}`);await audit(db,req,'prestamo',p.id,'devuelto',{...req.body,acta:codigo});return {ok:true,comprobante:codigo};
  }));
  // Actas LOG: la de entrega y devolución también la consulta el voluntario asignado.
  router.get('/actas/:codigo',requireRole('voluntario','jefe_logistica','presidente'),get(async req=>{
    const codigo=String(req.params.codigo).toUpperCase();
    exigir(/^LOG\d{3,}$/.test(codigo),'Acta no encontrada',404);
    const [[a]]=await pool.query(`SELECT a.codigo,a.tipo,a.created_at fecha,a.estado_equipo,a.motivo,a.prestamo_id,${NOMBRE('r')} registrado_nombre,
      e.codigo equipo_codigo,e.nombre equipo_nombre,e.tipo equipo_tipo,e.observaciones equipo_observaciones,
      p.voluntario_id,${NOMBRE('v')} voluntario,v.carnet_identidad voluntario_ci,v.grado voluntario_grado,
      p.motivo prestamo_motivo,p.fecha_devolucion,p.created_at solicitud_fecha,${NOMBRE('sl')} solicitado_nombre,
      ${NOMBRE('au')} autorizado_nombre,p.autorizado_at,p.estado_salida,${NOMBRE('dv')} devuelto_nombre,p.devuelto_at,p.estado_devolucion,p.observacion_devolucion,
      (SELECT x.codigo FROM log_actas x WHERE x.prestamo_id=a.prestamo_id AND x.tipo='entrega') acta_entrega,
      (SELECT x.codigo FROM log_actas x WHERE x.prestamo_id=a.prestamo_id AND x.tipo='devolucion') acta_devolucion
      FROM log_actas a JOIN users r ON r.id=a.registrado_por JOIN log_equipos e ON e.id=a.equipo_id
      LEFT JOIN log_prestamos p ON p.id=a.prestamo_id LEFT JOIN users v ON v.id=p.voluntario_id LEFT JOIN users sl ON sl.id=p.solicitado_por
      LEFT JOIN users au ON au.id=p.autorizado_por LEFT JOIN users dv ON dv.id=p.devuelto_por WHERE a.codigo=?`,[codigo]);
    exigir(a&&(req.user.role!=='voluntario'||(a.tipo!=='baja'&&a.voluntario_id===req.user.id)),'Acta no encontrada',404);
    const {voluntario_id,...acta}=a; return acta;
  }));
  // Datos completos para el Excel de logística; el rango filtra préstamos y actas por fecha.
  router.get('/reportes/logistica',logPres,get(async req=>{
    const desde=req.query.desde?fecha(String(req.query.desde)):null,hasta=req.query.hasta?fecha(String(req.query.hasta)):null;
    exigir(!desde||!hasta||desde<=hasta,'La fecha inicial debe ser anterior a la final');
    const rango=col=>{const c=[],v=[];if(desde){c.push(`${col}>=?`);v.push(`${desde} 00:00:00`);}if(hasta){c.push(`${col}<=?`);v.push(`${hasta} 23:59:59`);}return [c.length?`AND ${c.join(' AND ')}`:'',v];};
    const [equipos]=await pool.query(`${EQUIPOS} ORDER BY e.tipo,e.codigo`);
    const [fp,vp]=rango('p.created_at');
    const [prestamos]=await pool.query(`SELECT p.id,p.estado,p.motivo,p.fecha_devolucion,p.created_at,p.autorizado_at,p.devuelto_at,p.estado_salida,p.estado_devolucion,
      p.observacion_devolucion,p.rechazo_motivo,e.codigo equipo_codigo,e.nombre equipo_nombre,e.tipo equipo_tipo,${NOMBRE('v')} voluntario,v.carnet_identidad voluntario_ci,
      ${NOMBRE('au')} autorizado_nombre,${NOMBRE('dv')} devuelto_nombre,
      (SELECT x.codigo FROM log_actas x WHERE x.prestamo_id=p.id AND x.tipo='entrega') acta_entrega,
      (SELECT x.codigo FROM log_actas x WHERE x.prestamo_id=p.id AND x.tipo='devolucion') acta_devolucion
      FROM log_prestamos p JOIN log_equipos e ON e.id=p.equipo_id JOIN users v ON v.id=p.voluntario_id
      LEFT JOIN users au ON au.id=p.autorizado_por LEFT JOIN users dv ON dv.id=p.devuelto_por WHERE 1=1 ${fp} ORDER BY p.created_at,p.id`,vp);
    const [fa,va]=rango('a.created_at');
    const [actas]=await pool.query(`SELECT a.codigo,a.tipo,a.created_at,a.estado_equipo,a.motivo,e.codigo equipo_codigo,e.nombre equipo_nombre,e.tipo equipo_tipo,
      ${NOMBRE('r')} registrado_nombre,${NOMBRE('v')} voluntario FROM log_actas a JOIN log_equipos e ON e.id=a.equipo_id JOIN users r ON r.id=a.registrado_por
      LEFT JOIN log_prestamos p ON p.id=a.prestamo_id LEFT JOIN users v ON v.id=p.voluntario_id WHERE 1=1 ${fa} ORDER BY a.numero`,va);
    return {generado:new Date().toISOString(),hoy:hoyBolivia(),desde,hasta,equipos,prestamos,actas};
  }));
  router.get('/mi-file',requireRole('voluntario'),get(async req=>{
    const [documentos]=await pool.query('SELECT id,nombre,categoria,descripcion,archivo_url,created_at FROM voluntario_documentos WHERE voluntario_id=? ORDER BY id DESC',[req.user.id]);
    const [resoluciones]=await pool.query(`SELECT d.id,d.tipo,d.numero,d.anio,d.titulo,d.fecha FROM documentos_presidencia d JOIN documento_presidencia_voluntarios v ON v.documento_id=d.id WHERE v.voluntario_id=? ORDER BY d.id DESC`,[req.user.id]);
    const [memos]=await pool.query("SELECT id,tipo,titulo,descripcion,fecha FROM meritos WHERE voluntario_id=? ORDER BY fecha DESC",[req.user.id]);
    return {documentos,resoluciones,memos};
  }));
  router.get('/correos',requireRole('jefe_finanzas','jefe_logistica','jefe_personal','presidente'),get(async req=>{
    const prefijos=req.user.role==='jefe_finanzas'?['solicitud:%','mensualidad:%']:req.user.role==='jefe_logistica'?['prestamo:%','prestamo:%']:req.user.role==='jefe_personal'?['llamada:%','llamada:%']:['%','%'];
    const [rows]=await pool.query('SELECT id,evento,destinatario,asunto,intentos,enviado_at,ultimo_error,created_at FROM gestion_correos WHERE evento LIKE ? OR evento LIKE ? ORDER BY id DESC LIMIT 200',prefijos);
    return rows;
  }));
  registrarPersonal(router,{pool,servicio,get,post,audit});
  router.use((err,req,res,_next)=>{
    if(!err.status) console.error('Gestión:',err.code || err.message);
    res.status(err.status || (err.code==='ER_DUP_ENTRY'?409:500)).json({error:err.status?err.message:err.code==='ER_DUP_ENTRY'?'El código o registro ya existe':'No se pudo completar la operación'});
  });
  return router;
}
