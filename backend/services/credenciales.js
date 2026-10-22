import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { sql as scriptSql } from './migracionesSql.js';
import path from 'node:path';

const fallo = (ok, mensaje, status=400) => { if(!ok) throw Object.assign(new Error(mensaje),{status}); };
const diaBolivia = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz'}).format(new Date());
export function vencimientoAnual(fecha) {
  fallo(typeof fecha==='string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && Number.isFinite(Date.parse(fecha)) && new Date(fecha).toISOString().slice(0,10)===fecha,'Fecha de emisión inválida.');
  const [y,m,d]=fecha.split('-').map(Number);
  const ultimo = new Date(Date.UTC(y+1,m,0)).getUTCDate();
  return `${y+1}-${String(m).padStart(2,'0')}-${String(Math.min(d,ultimo)).padStart(2,'0')}`;
}
export function estadoCredencial(row, hoy=diaBolivia()) {
  if(row.estado!=='emitida') return row.estado;
  if(!row.activo || row.estado_personal==='baja') return 'inactivo';
  return hoy>String(row.fecha_vencimiento).slice(0,10)?'vencida':'vigente';
}
function hidratar(row) {
  const datos=typeof row.datos==='string'?JSON.parse(row.datos):row.datos;
  const verificacion_path=`/credenciales/verificar/${row.token}`;
  const origen=process.env.SITE_URL || 'https://bomberosatoq.org';
  return {id:row.id,voluntario_id:row.voluntario_id,codigo:`CREDYA-${String(row.id).padStart(6,'0')}`,
    estado:row.estado,estado_verificacion:estadoCredencial(row),diseno_version:Number(row.diseno_version||1),datos,
    fecha_emision:String(row.fecha_emision).slice(0,10),fecha_vencimiento:String(row.fecha_vencimiento).slice(0,10),
    verificacion_path,verificacion_url:new URL(verificacion_path,origen).href,tiene_pdf:!!row.sha256,emitido_at:row.emitido_at,
    anulacion_motivo:row.anulacion_motivo};
}
export function fichaPublicaCredencial(row) {
  const r=hidratar(row), d=r.datos;
  return {codigo:r.codigo,estado:r.estado_verificacion,fecha_emision:r.fecha_emision,fecha_vencimiento:r.fecha_vencimiento,
    duracion:'1 año',nombre:d.nombre,codigo_voluntario:d.codigo_voluntario,tipo_sangre:d.tipo_sangre,
    especialidad:d.especialidad,funcion:d.funcion,grado:d.grado,foto:d.foto};
}
export function validarEmisionCredencial(input) {
  fallo(input && typeof input==='object','Datos de credencial inválidos.');
  const id=Number(input.voluntario_id);
  fallo(Number.isInteger(id)&&id>0,'Seleccione un voluntario.');
  const funcion=typeof input.funcion==='string'?input.funcion.trim():'';
  fallo(funcion.length>0&&funcion.length<=90,'Complete la función (máximo 90 caracteres).');
  const vence=vencimientoAnual(input.fecha_emision);
  fallo(input.fecha_emision<=diaBolivia(),'La emisión no puede estar en el futuro.');
  const foto=input.foto;
  fallo(typeof foto==='string' && foto.length<=350000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(foto),'Adjunte una fotografía JPG del voluntario.');
  const bytes=Buffer.from(foto.split(',')[1],'base64');
  fallo(bytes.length>100 && bytes[0]===0xff && bytes[1]===0xd8,'Fotografía inválida.');
  return {voluntario_id:id,funcion,fecha_emision:input.fecha_emision,fecha_vencimiento:vence,foto};
}

export function crearServicioCredenciales({pool,storageDir}) {
  let ready;
  const init=()=>ready??=(async()=>{
    // La consulta usa users.estado_personal (script 08): si la base no la tiene, se crea igual que en ese script.
    const [[col]]=await pool.query("SELECT 1 existe FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='estado_personal'");
    if(!col)await pool.query("ALTER TABLE users ADD COLUMN estado_personal ENUM('activo','baja','pasiva','cooperador','comision') NOT NULL DEFAULT 'activo' AFTER activo");
    const sql=scriptSql('27_credenciales.sql');
    for(const query of sql.split(';').map(s=>s.trim()).filter(Boolean))await pool.query(query);
    const diseno=scriptSql('28_credenciales_diseno.sql');
    try {await pool.query(diseno);}catch(e){if(e.code!=='ER_DUP_FIELDNAME')throw e;}
    await mkdir(storageDir,{recursive:true});
  })().catch(e=>{ready=undefined;throw e;});
  const archivo=token=>path.join(storageDir,`${token}.pdf`);
  const consulta=`SELECT c.*,DATE_FORMAT(c.fecha_emision,'%Y-%m-%d') fecha_emision,
    DATE_FORMAT(c.fecha_vencimiento,'%Y-%m-%d') fecha_vencimiento,u.activo,u.estado_personal
    FROM credenciales c JOIN users u ON u.id=c.voluntario_id`;
  async function transaccion(fn) {
    await init();const db=await pool.getConnection();
    try {await db.beginTransaction();await db.query('SELECT id FROM credenciales_control WHERE id=1 FOR UPDATE');
      const r=await fn(db);await db.commit();return r;
    }catch(e){await db.rollback();throw e;}finally{db.release();}
  }
  return {init,
    async listar() {await init();const [rows]=await pool.query(`${consulta} ORDER BY c.id DESC`);return rows.map(hidratar);},
    async voluntarios() {
      const [rows]=await pool.query(`SELECT u.id,u.nombre,u.apellido_paterno,u.apellido_materno,u.codigo,u.matricula,
        u.tipo_sangre,u.especialidad,u.grado,u.cargo_directiva,u.role,u.activo,u.estado_personal,
        v.foto_url FROM users u LEFT JOIN voluntarios v ON v.user_id=u.id
        WHERE u.role NOT IN ('admin','postulante') ORDER BY u.apellido_paterno,u.nombre`);return rows;
    },
    async reservar(input,clave,actor) {
      const p=validarEmisionCredencial(input);
      fallo(typeof clave==='string'&&/^[a-f0-9-]{36}$/i.test(clave),'Clave de emisión inválida.');
      const huella=createHash('sha256').update(JSON.stringify(p)).digest('hex');
      return transaccion(async db=>{
        const [[existente]]=await db.query(`${consulta} WHERE c.clave_solicitud=?`,[clave]);
        if(existente){fallo(existente.creado_por===actor&&existente.huella===huella,'La solicitud ya pertenece a otra emisión.',409);return hidratar(existente);}
        const [[u]]=await db.query("SELECT * FROM users WHERE id=? AND role NOT IN ('admin','postulante') FOR UPDATE",[p.voluntario_id]);
        fallo(u&&u.activo&&u.estado_personal!=='baja','El voluntario debe estar activo para emitir su credencial.',409);
        fallo(u.matricula || u.codigo,'El voluntario necesita un código o matrícula en su file.');
        fallo(['A+','A-','B+','B-','AB+','AB-','O+','O-'].includes(u.tipo_sangre),'Complete un tipo de sangre válido en el file del voluntario.');
        const [[pendiente]]=await db.query("SELECT id FROM credenciales WHERE voluntario_id=? AND estado='pendiente'",[u.id]);
        fallo(!pendiente,'Hay una credencial pendiente. Complétela o anúlela antes de crear otra.',409);
        const nombre=[u.nombre,u.apellido_paterno,u.apellido_materno].filter(Boolean).join(' ').trim();
        const datos={nombre,codigo_voluntario:u.matricula||u.codigo,tipo_sangre:u.tipo_sangre,especialidad:(u.especialidad||'').trim(),
          funcion:p.funcion,grado:u.grado||'',foto:p.foto};
        const token=randomBytes(32).toString('hex');
        const [r]=await db.query(`INSERT INTO credenciales (voluntario_id,token,clave_solicitud,huella,datos,fecha_emision,fecha_vencimiento,creado_por) VALUES (?,?,?,?,?,?,?,?)`,
          [u.id,token,clave,huella,JSON.stringify(datos),p.fecha_emision,p.fecha_vencimiento,actor]);
        const [[row]]=await db.query(`${consulta} WHERE c.id=?`,[r.insertId]);return hidratar(row);
      });
    },
    async guardarPDF(id,buffer,version=1) {
      const diseno=Number(version);
      fallo([1,2].includes(diseno),'Versión de diseño inválida.');
      fallo(Buffer.isBuffer(buffer)&&buffer.length>100&&buffer.length<=5*1024*1024&&buffer.subarray(0,5).toString()==='%PDF-','Adjunte un PDF válido de hasta 5 MB.');
      const hash=createHash('sha256').update(buffer).digest('hex');
      return transaccion(async db=>{
        const [[r]]=await db.query(`${consulta} WHERE c.id=?`,[id]);fallo(r,'Credencial no encontrada.',404);
        if(r.sha256){
          if(diseno>Number(r.diseno_version||1)){
            // Actualizar el diseño conserva el registro, código, QR, fechas y estado de la emisión.
            await writeFile(archivo(r.token),buffer);
            await db.query('UPDATE credenciales SET sha256=?,diseno_version=? WHERE id=?',[hash,diseno,r.id]);
            const [[actualizada]]=await db.query(`${consulta} WHERE c.id=?`,[r.id]);return hidratar(actualizada);
          }
          fallo(r.sha256===hash,'El PDF registrado no puede modificarse con la misma versión de diseño.',409);return hidratar(r);
        }
        fallo(r.estado==='pendiente','No se puede emitir esta credencial.',409);
        fallo(r.activo && r.estado_personal!=='baja','El voluntario ya no está activo.',409);
        await writeFile(archivo(r.token),buffer);
        await db.query("UPDATE credenciales SET estado='reemplazada' WHERE voluntario_id=? AND estado='emitida'",[r.voluntario_id]);
        await db.query("UPDATE credenciales SET estado='emitida',sha256=?,diseno_version=?,emitido_at=NOW() WHERE id=?",[hash,diseno,r.id]);
        const [[row]]=await db.query(`${consulta} WHERE c.id=?`,[id]);return hidratar(row);
      });
    },
    async anular(id,motivo,actor) {
      fallo(typeof motivo==='string'&&motivo.trim().length>0&&motivo.trim().length<=500,'Indique el motivo de anulación (máximo 500 caracteres).');
      return transaccion(async db=>{
        const [r]=await db.query("UPDATE credenciales SET estado='anulada',anulacion_motivo=?,anulado_por=?,anulado_at=NOW() WHERE id=? AND estado IN ('pendiente','emitida')",[motivo.trim(),actor,id]);
        fallo(r.affectedRows,'La credencial ya fue anulada, reemplazada o no existe.',409);return {ok:true};
      });
    },
    async publico(token) {
      fallo(/^[a-f0-9]{64}$/.test(token),'Credencial no encontrada.',404);await init();
      const [[row]]=await pool.query(`${consulta} WHERE c.token=? AND c.estado<>'pendiente'`,[token]);
      fallo(row,'Credencial no encontrada.',404);return fichaPublicaCredencial(row);
    },
    async original(id) {
      await init();const [[row]]=await pool.query('SELECT id,token,estado FROM credenciales WHERE id=? AND sha256 IS NOT NULL',[id]);
      fallo(row,'PDF no disponible. Complete primero la emisión.',404);
      return {archivo:archivo(row.token),nombre:`CREDYA-${String(row.id).padStart(6,'0')}.pdf`};
    },
  };
}
